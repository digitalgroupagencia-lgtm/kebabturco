import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Monitor, Palette, Globe, Save, Sparkles, Upload } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import type { Tables } from "@/integrations/supabase/types";
import ImageUploadField from "@/components/panel/ImageUploadField";
import { uploadBrandingImage } from "@/lib/uploadImage";

type TotemConfig = Tables<"totem_config">;

const ALL_LANGS = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

type LangMap = { pt: string; en: string; es: string; fr: string };

const emptyLangMap = (): LangMap => ({ pt: "", en: "", es: "", fr: "" });

const asLangMap = (value: unknown): LangMap => {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, string>;
  return { pt: v.pt || "", en: v.en || "", es: v.es || "", fr: v.fr || "" };
};

const TotemConfigPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;

  const [config, setConfig] = useState<TotemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#D62300");
  const [secondaryColor, setSecondaryColor] = useState("#F5F5F5");
  const [accentColor, setAccentColor] = useState("#FFC72C");
  const [ctaColor, setCtaColor] = useState("#28A745");
  const [enableDineIn, setEnableDineIn] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [welcomePt, setWelcomePt] = useState("");
  const [welcomeEn, setWelcomeEn] = useState("");
  const [primaryLang, setPrimaryLang] = useState<string>("es");
  const [activeLangs, setActiveLangs] = useState<string[]>(["es"]);
  const [langIcons, setLangIcons] = useState<Record<string, string>>({});

  // Suggestion section (cart) state
  const [suggEnabled, setSuggEnabled] = useState(true);
  const [suggTitle, setSuggTitle] = useState<LangMap>(emptyLangMap());
  const [suggProductIds, setSuggProductIds] = useState<string[]>([]);
  const [suggBtnEnabled, setSuggBtnEnabled] = useState(false);
  const [suggBtnLabel, setSuggBtnLabel] = useState<LangMap>(emptyLangMap());
  const [suggBtnCategoryId, setSuggBtnCategoryId] = useState<string>("");

  // Menu data for selectors
  const [menuCategories, setMenuCategories] = useState<{ id: string; name: string }[]>([]);
  const [menuProducts, setMenuProducts] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [productFilter, setProductFilter] = useState("");

  useEffect(() => {
    if (storeId) {
      fetchConfig();
      fetchMenu();
    }
  }, [storeId]);

  const pickName = (n: any): string => {
    if (n && typeof n === "object") return n.es || n.pt || n.en || n.fr || "";
    return String(n || "");
  };

  const fetchMenu = async () => {
    if (!storeId) return;
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("id, name, sort_order").eq("store_id", storeId).eq("is_active", true).order("sort_order"),
      supabase.from("products").select("id, name, category_id, sort_order").eq("store_id", storeId).eq("is_active", true).order("sort_order"),
    ]);
    setMenuCategories((cats || []).map((c: any) => ({ id: c.id, name: pickName(c.name) })));
    setMenuProducts((prods || []).map((p: any) => ({ id: p.id, name: pickName(p.name), category_id: p.category_id })));
  };

  const fetchConfig = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("totem_config")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (data) {
      setConfig(data);
      setLogoUrl(data.logo_url || "");
      setBgImageUrl(data.bg_image_url || "");
      setPrimaryColor(data.primary_color || "#D62300");
      setSecondaryColor(data.secondary_color || "#F5F5F5");
      setAccentColor(data.accent_color || "#FFC72C");
      setCtaColor(data.cta_color || "#28A745");
      setEnableDineIn(data.enable_dine_in ?? true);
      setEnableTakeaway(data.enable_takeaway ?? true);
      const welcome = data.welcome_message as Record<string, string> | null;
      setWelcomePt(welcome?.pt || "");
      setWelcomeEn(welcome?.en || "");
      setPrimaryLang((data as any).primary_language || "es");
      setActiveLangs((data.active_languages as string[]) || ["es"]);
      setLangIcons(((data as any).language_icons as Record<string, string>) || {});

      // Suggestion config
      const sc = ((data as any).screen_config || {}) as any;
      const rs = sc.review_suggestion || {};
      setSuggEnabled(rs.enabled !== false);
      setSuggTitle(asLangMap(rs.title));
      setSuggProductIds(Array.isArray(rs.product_ids) ? rs.product_ids : []);
      setSuggBtnEnabled(Boolean(rs.button?.enabled));
      setSuggBtnLabel(asLangMap(rs.button?.label));
      setSuggBtnCategoryId(rs.button?.category_id || "");
    }
    setLoading(false);
  };

  const uploadLangIcon = async (code: string, file: File) => {
    if (!storeId) return;
    const ext = file.name.split(".").pop();
    const path = `${storeId}/lang-${code}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Error al subir ícono");
      return;
    }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setLangIcons((prev) => ({ ...prev, [code]: pub.publicUrl }));
    toast.success("Ícono cargado — recuerda guardar");
  };

  const uploadTotemLogo = async (file: File) => {
    if (!storeId) return;
    setLogoUploading(true);
    try {
      const url = await uploadBrandingImage(storeId, "totem-logo", file);
      setLogoUrl(url);
      toast.success("Logo enviado — lembre de salvar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const uploadTotemBackground = async (file: File) => {
    if (!storeId) return;
    setBgUploading(true);
    try {
      const url = await uploadBrandingImage(storeId, "totem-bg", file);
      setBgImageUrl(url);
      toast.success("Imagem de fundo enviada — lembre de salvar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setBgUploading(false);
    }
  };

  const toggleActiveLang = (code: string) => {
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

  const toggleSuggProduct = (id: string) => {
    setSuggProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const saveConfig = async () => {
    if (!storeId) return;
    setSaving(true);

    const prevScreenConfig = ((config as any)?.screen_config || {}) as Record<string, unknown>;
    const screenConfig = {
      ...prevScreenConfig,
      review_suggestion: {
        enabled: suggEnabled,
        title: suggTitle,
        product_ids: suggProductIds,
        button: {
          enabled: suggBtnEnabled,
          label: suggBtnLabel,
          category_id: suggBtnCategoryId || null,
        },
      },
    };

    const payload = {
      store_id: storeId,
      logo_url: logoUrl || null,
      bg_image_url: bgImageUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      cta_color: ctaColor,
      enable_dine_in: enableDineIn,
      enable_takeaway: enableTakeaway,
      welcome_message: { pt: welcomePt, en: welcomeEn } as unknown as import("@/integrations/supabase/types").Json,
      primary_language: primaryLang,
      active_languages: Array.from(new Set([primaryLang, ...activeLangs])),
      language_icons: langIcons as unknown as import("@/integrations/supabase/types").Json,
      screen_config: screenConfig as unknown as import("@/integrations/supabase/types").Json,
    };

    let error;
    if (config) {
      ({ error } = await supabase.from("totem_config").update(payload).eq("id", config.id));
    } else {
      ({ error } = await supabase.from("totem_config").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração salva!");
      fetchConfig();
    }
    setSaving(false);
  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configuração do Totem</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Você não está associado a nenhuma loja.
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProducts = menuProducts.filter((p) =>
    productFilter.trim() === "" ? true : p.name.toLowerCase().includes(productFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <HowToUsePanel
        purpose="Personaliza a tela do totem (cores, idiomas, splash, mensagens de boas-vindas)."
        whenToUse="Antes de abrir um novo totem para o cliente e quando trocar a campanha."
        steps={[
          "Escolha os idiomas oferecidos ao cliente (mínimo 1).",
          "Suba a imagem ou vídeo de splash.",
          "Defina as cores principais (devem combinar com a marca).",
          "Salve. O totem actualiza no próximo reinício.",
        ]}
        howToConfirm="Abra o totem no tablet: a splash, idiomas e cores aparecem como configurado."
        assistantQuestion="Que configuração de totem aumenta conversão em zona turística com 4 idiomas?"
      />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" /> Configuração do Totem
        </h2>
        <Button onClick={saveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" /> Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadField
            label="Logo do totem"
            dimensions="512×512 px, fundo transparente"
            value={logoUrl}
            uploading={logoUploading}
            disabled={!storeId}
            onPickFile={uploadTotemLogo}
          />
          <ImageUploadField
            label="Imagem de fundo"
            dimensions="1080×1920 px, vertical (ecrã totem)"
            value={bgImageUrl}
            uploading={bgUploading}
            disabled={!storeId}
            onPickFile={uploadTotemBackground}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Cor Principal</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>Cor Destaque</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>Cor do CTA</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Idiomas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Idiomas do projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Idioma principal</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Define a língua padrão do totem e dos textos da impressora.
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
                      setActiveLangs((prev) => (prev.includes(l.code) ? prev : [...prev, l.code]));
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
          </div>

          <div>
            <Label>Idiomas disponíveis no totem (até 4)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Aparecem como ícones na primeira tela. Faça upload da bandeira/ícone (recomendado 256×256 px).
            </p>
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
                      onCheckedChange={() => toggleActiveLang(l.code)}
                      disabled={l.code === primaryLang}
                    />
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {icon ? (
                        <img src={icon} alt={l.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{l.code.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{l.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.code === primaryLang ? "Idioma principal" : active ? "Disponível" : "Desativado"}
                      </p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => e.target.files?.[0] && uploadLangIcon(l.code, e.target.files[0])}
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> Ícone</span>
                      </Button>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opções do Fluxo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Comer Aqui</Label>
            <Switch checked={enableDineIn} onCheckedChange={setEnableDineIn} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Para Levar</Label>
            <Switch checked={enableTakeaway} onCheckedChange={setEnableTakeaway} />
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Mensagem de Boas-vindas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Português</Label>
            <Input value={welcomePt} onChange={(e) => setWelcomePt(e.target.value)} placeholder="Bem-vindo! Faça seu pedido" />
          </div>
          <div>
            <Label>English</Label>
            <Input value={welcomeEn} onChange={(e) => setWelcomeEn(e.target.value)} placeholder="Welcome! Place your order" />
          </div>
        </CardContent>
      </Card>

      {/* Sugestão no Carrinho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" /> Sugestão no Carrinho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Define quais produtos aparecem como sugestão na tela de revisão do pedido (ex.: bebidas, sobremesas, combos). Você pode escolher os produtos, o título da seção e um botão opcional que leva a uma categoria do cardápio.
          </p>

          <div className="flex items-center justify-between">
            <Label>Mostrar seção de sugestão</Label>
            <Switch checked={suggEnabled} onCheckedChange={setSuggEnabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_LANGS.map((l) => (
              <div key={l.code}>
                <Label className="text-xs">Título — {l.label}</Label>
                <Input
                  value={(suggTitle as any)[l.code] || ""}
                  onChange={(e) => setSuggTitle((prev) => ({ ...prev, [l.code]: e.target.value }))}
                  placeholder={l.code === "es" ? "¿Y una bebida?" : l.code === "pt" ? "Que tal uma bebida?" : l.code === "en" ? "How about a drink?" : "Une boisson ?"}
                />
              </div>
            ))}
          </div>

          <div>
            <Label>Produtos sugeridos</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Selecione um ou mais produtos. Eles aparecerão como cards na tela de revisão.
            </p>
            <Input
              placeholder="Buscar produto..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="mb-2"
            />
            <div className="border border-border rounded-xl max-h-64 overflow-y-auto divide-y divide-border">
              {filteredProducts.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">Nenhum produto encontrado.</p>
              )}
              {filteredProducts.map((p) => {
                const checked = suggProductIds.includes(p.id);
                const catName = menuCategories.find((c) => c.id === p.category_id)?.name || "";
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 ${checked ? "bg-primary/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSuggProduct(p.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{catName}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {suggProductIds.length} produto(s) selecionado(s)
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Botão "ver mais" do lado dos produtos</Label>
              <Switch checked={suggBtnEnabled} onCheckedChange={setSuggBtnEnabled} />
            </div>
            {suggBtnEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_LANGS.map((l) => (
                    <div key={l.code}>
                      <Label className="text-xs">Texto do botão — {l.label}</Label>
                      <Input
                        value={(suggBtnLabel as any)[l.code] || ""}
                        onChange={(e) => setSuggBtnLabel((prev) => ({ ...prev, [l.code]: e.target.value }))}
                        placeholder={l.code === "es" ? "Ver bebidas" : l.code === "pt" ? "Ver bebidas" : l.code === "en" ? "See drinks" : "Voir boissons"}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Categoria de destino</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Ao clicar no botão, o cliente é levado para esta categoria do cardápio.
                  </p>
                  <select
                    value={suggBtnCategoryId}
                    onChange={(e) => setSuggBtnCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">— Selecione uma categoria —</option>
                    {menuCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TotemConfigPage;
