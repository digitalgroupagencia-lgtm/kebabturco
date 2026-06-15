import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
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
  { code: "pt", labelKey: "totem.lang.label_pt" },
  { code: "en", labelKey: "totem.lang.label_en" },
  { code: "es", labelKey: "totem.lang.label_es" },
  { code: "fr", labelKey: "totem.lang.label_fr" },
] as const;

const SUGG_TITLE_PH_KEY: Record<(typeof ALL_LANGS)[number]["code"], string> = {
  pt: "totem.suggestion.ph_title_pt",
  en: "totem.suggestion.ph_title_en",
  es: "totem.suggestion.ph_title_es",
  fr: "totem.suggestion.ph_title_fr",
};

const SUGG_BTN_PH_KEY: Record<(typeof ALL_LANGS)[number]["code"], string> = {
  pt: "totem.suggestion.ph_btn_pt",
  en: "totem.suggestion.ph_btn_en",
  es: "totem.suggestion.ph_btn_es",
  fr: "totem.suggestion.ph_btn_fr",
};

type LangMap = { pt: string; en: string; es: string; fr: string };

const emptyLangMap = (): LangMap => ({ pt: "", en: "", es: "", fr: "" });

const asLangMap = (value: unknown): LangMap => {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, string>;
  return { pt: v.pt || "", en: v.en || "", es: v.es || "", fr: v.fr || "" };
};

const TotemConfigPage = () => {
  const { t, lang } = useStaffT();
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
      toast.error(t("totem.toast.icon_error"));
      return;
    }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setLangIcons((prev) => ({ ...prev, [code]: pub.publicUrl }));
    toast.success(t("totem.toast.icon_ok"));
  };

  const uploadTotemLogo = async (file: File) => {
    if (!storeId) return;
    setLogoUploading(true);
    try {
      const url = await uploadBrandingImage(storeId, "totem-logo", file);
      setLogoUrl(url);
      toast.success(t("totem.toast.logo_ok"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("menu.toast.image_error"));
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
      toast.success(t("totem.toast.bg_ok"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("menu.toast.image_error"));
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
        toast.error(t("totem.toast.max_langs"));
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
      toast.error(t("totem.toast.save_error"));
    } else {
      toast.success(t("totem.toast.saved"));
      fetchConfig();
    }
    setSaving(false);
  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("page.totem.title")}</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("totem.no_store")}
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
        purpose={t("howto.totem.purpose")}
        whenToUse={t("howto.totem.when")}
        steps={[t("howto.totem.step1"), t("howto.totem.step2"), t("howto.totem.step3"), t("howto.totem.step4")]}
        howToConfirm={t("howto.totem.confirm")}
        assistantQuestion={t("howto.totem.assistant")}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" /> {t("page.totem.title")}
        </h2>
        <Button onClick={saveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? t("totem.saving") : t("totem.save")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" /> {t("totem.branding")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadField
            label={t("totem.logo")}
            dimensions={t("totem.logo.dimensions")}
            value={logoUrl}
            uploading={logoUploading}
            disabled={!storeId}
            onPickFile={uploadTotemLogo}
          />
          <ImageUploadField
            label={t("totem.bg")}
            dimensions={t("totem.bg.dimensions")}
            value={bgImageUrl}
            uploading={bgUploading}
            disabled={!storeId}
            onPickFile={uploadTotemBackground}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>{t("totem.color.primary")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>{t("totem.color.secondary")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>{t("totem.color.accent")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label>{t("totem.color.cta")}</Label>
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
            <Globe className="h-5 w-5" /> {t("totem.langs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("totem.lang.primary")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("totem.lang.primary_hint")}</p>
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
                    {t(l.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{t("totem.lang.available")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("totem.lang.icon_upload_hint")}</p>
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
                        <img src={icon} alt={t(l.labelKey)} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{l.code.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{t(l.labelKey)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.code === primaryLang ? t("totem.lang.primary_badge") : active ? t("totem.lang.available_badge") : t("totem.lang.disabled_badge")}
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
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> {t("totem.lang.icon")}</span>
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
          <CardTitle className="text-lg">{t("totem.flow.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("totem.dine_in")}</Label>
            <Switch checked={enableDineIn} onCheckedChange={setEnableDineIn} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("totem.takeaway")}</Label>
            <Switch checked={enableTakeaway} onCheckedChange={setEnableTakeaway} />
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> {t("totem.welcome.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("totem.welcome.pt")}</Label>
            <Input value={welcomePt} onChange={(e) => setWelcomePt(e.target.value)} placeholder={t("totem.welcome.ph_pt")} />
          </div>
          <div>
            <Label>{t("totem.welcome.en")}</Label>
            <Input value={welcomeEn} onChange={(e) => setWelcomeEn(e.target.value)} placeholder={t("totem.welcome.ph_en")} />
          </div>
        </CardContent>
      </Card>

      {/* Sugestão no Carrinho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" /> {t("totem.suggestion.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t("totem.suggestion.hint_full")}</p>

          <div className="flex items-center justify-between">
            <Label>{t("totem.suggestion.show")}</Label>
            <Switch checked={suggEnabled} onCheckedChange={setSuggEnabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_LANGS.map((l) => (
              <div key={l.code}>
                <Label className="text-xs">{panelT(lang, "totem.suggestion.title_label", { lang: t(l.labelKey) })}</Label>
                <Input
                  value={(suggTitle as any)[l.code] || ""}
                  onChange={(e) => setSuggTitle((prev) => ({ ...prev, [l.code]: e.target.value }))}
                  placeholder={t(SUGG_TITLE_PH_KEY[l.code])}
                />
              </div>
            ))}
          </div>

          <div>
            <Label>{t("totem.suggestion.products")}</Label>
            <p className="text-[11px] text-muted-foreground mb-2">{t("totem.suggestion.products_hint")}</p>
            <Input
              placeholder={t("totem.suggestion.search")}
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="mb-2"
            />
            <div className="border border-border rounded-xl max-h-64 overflow-y-auto divide-y divide-border">
              {filteredProducts.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">{t("totem.suggestion.none")}</p>
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
              {panelT(lang, "totem.suggestion.selected", { count: suggProductIds.length })}
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("totem.suggestion.more_btn")}</Label>
              <Switch checked={suggBtnEnabled} onCheckedChange={setSuggBtnEnabled} />
            </div>
            {suggBtnEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_LANGS.map((l) => (
                    <div key={l.code}>
                      <Label className="text-xs">{panelT(lang, "totem.suggestion.btn_label", { lang: t(l.labelKey) })}</Label>
                      <Input
                        value={(suggBtnLabel as any)[l.code] || ""}
                        onChange={(e) => setSuggBtnLabel((prev) => ({ ...prev, [l.code]: e.target.value }))}
                        placeholder={t(SUGG_BTN_PH_KEY[l.code])}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t("totem.suggestion.dest_category")}</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">{t("totem.suggestion.dest_hint")}</p>
                  <select
                    value={suggBtnCategoryId}
                    onChange={(e) => setSuggBtnCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">{t("totem.suggestion.select_category")}</option>
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
