import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Upload, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const ALL_LANGS = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

interface Props {
  tenantId: string;
  tenantName: string;
}

interface StoreRow { id: string; name: string }

export default function TenantLanguagesDialog({ tenantId, tenantName }: Props) {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [primaryLang, setPrimaryLang] = useState("es");
  const [activeLangs, setActiveLangs] = useState<string[]>(["es"]);
  const [langIcons, setLangIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("tenant_id", tenantId);
      setStores(data ?? []);
      if (data && data.length > 0) setStoreId(data[0].id);
    })();
  }, [open, tenantId]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("totem_config").select("*").eq("store_id", storeId).maybeSingle();
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
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Idiomas">
          <Globe className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> Idiomas — {tenantName}
          </DialogTitle>
        </DialogHeader>

        {stores.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Este cliente ainda não tem lojas. Crie uma loja primeiro.
          </p>
        ) : (
          <div className="space-y-4">
            {stores.length > 1 && (
              <div>
                <Label>Loja</Label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm mt-1"
                >
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <>
                <div>
                  <Label>Idioma principal</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Define o idioma padrão do totem e dos textos da impressora.
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
                            setActiveLangs((prev) => prev.includes(l.code) ? prev : [...prev, l.code]);
                          }}
                          className={`p-2 rounded-xl border-2 text-xs font-bold transition-all ${
                            isPrim ? "border-primary bg-primary/10 text-primary" : "border-border"
                          }`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Idiomas disponíveis (até 4)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Bandeira/ícone aparece na primeira tela. Recomendado <strong>256×256 px</strong>, PNG transparente.
                  </p>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {ALL_LANGS.map((l) => {
                      const active = activeLangs.includes(l.code);
                      const icon = langIcons[l.code];
                      return (
                        <div key={l.code} className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                          active ? "border-primary/40 bg-primary/5" : "border-border"
                        }`}>
                          <Switch
                            checked={active}
                            onCheckedChange={() => toggleActive(l.code)}
                            disabled={l.code === primaryLang}
                          />
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {icon ? <img src={icon} alt={l.label} className="w-full h-full object-cover" /> : (
                              <span className="text-[10px] text-muted-foreground">{l.code.toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">{l.label}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {l.code === primaryLang ? "Principal" : active ? "Ativo" : "Inativo"}
                            </p>
                          </div>
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" hidden
                              onChange={(e) => e.target.files?.[0] && uploadLangIcon(l.code, e.target.files[0])} />
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span><Upload className="w-3.5 h-3.5 mr-1" /> Ícone</span>
                            </Button>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full" onClick={save} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar idiomas"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
