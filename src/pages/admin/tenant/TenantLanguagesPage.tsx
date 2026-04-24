import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Save, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const ALL_LANGS = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

export default function TenantLanguagesPage() {
  const { tenant, loading: tLoading } = useSelectedTenant();
  const storeId = tenant?.store_id ?? null;

  const [configId, setConfigId] = useState<string | null>(null);
  const [primaryLang, setPrimaryLang] = useState("es");
  const [activeLangs, setActiveLangs] = useState<string[]>(["es"]);
  const [langIcons, setLangIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("totem_config")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (data) {
        setConfigId(data.id);
        setPrimaryLang((data as any).primary_language || "es");
        setActiveLangs((data.active_languages as string[]) || ["es"]);
        setLangIcons(((data as any).language_icons as Record<string, string>) || {});
      } else {
        setConfigId(null);
        setPrimaryLang("es");
        setActiveLangs(["es"]);
        setLangIcons({});
      }
      setLoading(false);
    })();
  }, [storeId]);

  const uploadLangIcon = async (code: string, file: File) => {
    if (!storeId) return;
    const ext = file.name.split(".").pop();
    const path = `${storeId}/lang-${code}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });
    if (error) return toast.error("Erro ao subir ícone");
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setLangIcons((prev) => ({ ...prev, [code]: pub.publicUrl }));
    toast.success("Ícone carregado — lembre de salvar");
  };

  const toggleActive = (code: string) => {
    setActiveLangs((prev) => {
      if (prev.includes(code)) {
        if (code === primaryLang) return prev;
        return prev.filter((l) => l !== code);
      }
      if (prev.length >= 4) {
        toast.error("Máximo 4 idiomas");
        return prev;
      }
      return [...prev, code];
    });
  };

  const save = async () => {
    if (!storeId) return;
    setSaving(true);
    const payload = {
      store_id: storeId,
      primary_language: primaryLang,
      active_languages: Array.from(new Set([primaryLang, ...activeLangs])),
      language_icons: langIcons as unknown as Json,
    };
    const { error } = configId
      ? await supabase.from("totem_config").update(payload).eq("id", configId)
      : await supabase.from("totem_config").insert(payload);
    if (error) toast.error(error.message);
    else toast.success("Idiomas salvos!");
    setSaving(false);
  };

  if (tLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este cliente ainda não tem loja cadastrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" /> Idiomas do projeto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Defina o idioma principal e quais bandeiras aparecem na primeira tela do totem.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Idioma principal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Idioma padrão do totem e dos textos da impressora.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_LANGS.map((l) => {
              const isPrim = primaryLang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setPrimaryLang(l.code);
                    setActiveLangs((prev) =>
                      prev.includes(l.code) ? prev : [...prev, l.code],
                    );
                  }}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    isPrim ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Idiomas disponíveis (até 4)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Bandeira/ícone aparece na primeira tela. Recomendado <strong>256×256 px</strong>, PNG transparente.
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {ALL_LANGS.map((l) => {
                const active = activeLangs.includes(l.code);
                const icon = langIcons[l.code];
                return (
                  <div
                    key={l.code}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      active ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <Switch
                      checked={active}
                      onCheckedChange={() => toggleActive(l.code)}
                      disabled={l.code === primaryLang}
                    />
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {icon ? (
                        <img src={icon} alt={l.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {l.code.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{l.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.code === primaryLang
                          ? "Idioma principal"
                          : active
                            ? "Disponível"
                            : "Desativado"}
                      </p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          e.target.files?.[0] && uploadLangIcon(l.code, e.target.files[0])
                        }
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-3.5 h-3.5 mr-1" /> Ícone
                        </span>
                      </Button>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}