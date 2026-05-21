import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Palette, Image as ImageIcon, Save, Upload, UtensilsCrossed, ShoppingBag, Bike,
  Languages, ListOrdered, Sparkles, Loader2, Monitor,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";

type Settings = Tables<"company_settings">;

const BrandingPage = () => {
  const { storeId: STORE_ID, loading: loadingStore } = useAdminStoreId();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("splash");

  useEffect(() => { if (STORE_ID) load(); }, [STORE_ID]);

  const load = async () => {
    if (!STORE_ID) return;
    const { data } = await supabase.from("company_settings").select("*").eq("store_id", STORE_ID).maybeSingle();
    if (data) setS(data);
    else {
      const { data: created } = await supabase.from("company_settings").insert({ store_id: STORE_ID, company_name: "" }).select().maybeSingle();
      if (created) setS(created);
    }
  };

  const update = (k: keyof Settings, v: any) => setS((p) => p ? { ...p, [k]: v } : p);

  const upload = async (field: keyof Settings, file: File) => {
    if (!STORE_ID) return;
    const ext = file.name.split(".").pop();
    const path = `${STORE_ID}/${String(field)}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao subir: " + error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    update(field, pub.publicUrl);
    toast.success("Imagem carregada — lembra de salvar");
  };

  const save = async () => {
    if (!s || !STORE_ID) return;
    setSaving(true);
    const { error } = await supabase.from("company_settings").update({
      company_name: s.company_name,
      logo_main_url: s.logo_main_url,
      logo_secondary_url: s.logo_secondary_url,
      banner_home_url: s.banner_home_url,
      icon_dine_in_url: s.icon_dine_in_url,
      icon_takeaway_url: s.icon_takeaway_url,
      icon_delivery_url: (s as any).icon_delivery_url,
      logo_language_url: (s as any).logo_language_url,
      logo_order_type_url: (s as any).logo_order_type_url,
      logo_main_dark_url: (s as any).logo_main_dark_url,
      logo_secondary_dark_url: (s as any).logo_secondary_dark_url,
      logo_language_dark_url: (s as any).logo_language_dark_url,
      logo_order_type_dark_url: (s as any).logo_order_type_dark_url,
      primary_color: s.primary_color,
      secondary_color: s.secondary_color,
      background_color: s.background_color,
      text_color: s.text_color,
      accent_color: s.accent_color,
      cta_color: s.cta_color,
      header_color: (s as any).header_color,
    }).eq("store_id", STORE_ID);
    setSaving(false);
    if (error) toast.error("Erro ao salvar"); else toast.success("Identidade visual atualizada!");
  };

  if (loadingStore || !s) {
    return <div className="p-8 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>;
  }

  // ----- helpers -----
  const ImageField = ({ label, field, dimensions }: { label: string; field: keyof Settings; dimensions?: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    const url = (s as any)[field] as string | null;
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 flex-wrap">
          <ImageIcon className="h-4 w-4" /> {label}
          {dimensions && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {dimensions}
            </span>
          )}
        </Label>
        <div className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/30">
          <div className="w-20 h-20 rounded-2xl bg-background overflow-hidden flex items-center justify-center border shrink-0">
            {url ? <img src={url} alt={label} className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
              onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Subir imagem
            </Button>
            {dimensions && (
              <p className="text-[11px] text-muted-foreground">Tamanho recomendado: <strong>{dimensions}</strong> · PNG / JPG / WEBP</p>
            )}
            <Input value={url || ""} onChange={(e) => update(field, e.target.value)} placeholder="https://..." className="text-xs" />
          </div>
        </div>
      </div>
    );
  };

  const ColorField = ({ label, field }: { label: string; field: keyof Settings }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" value={(s as any)[field]} onChange={(e) => update(field, e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
        <Input value={(s as any)[field]} onChange={(e) => update(field, e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );

  // ----- preview phone frame -----
  const Phone = ({ children, bg }: { children: React.ReactNode; bg?: string }) => (
    <div className="mx-auto rounded-[2rem] border-8 border-foreground/90 overflow-hidden shadow-xl"
      style={{ width: 280, height: 560, background: bg || s.background_color }}>
      {children}
    </div>
  );

  // ----- previews -----
  const SplashPreview = () => (
    <Phone>
      <div className="h-full flex flex-col items-center justify-center px-4" style={{ color: s.text_color }}>
        {s.logo_main_url ? (
          <img src={s.logo_main_url} alt="" className="w-32 h-32 object-contain mb-4" />
        ) : (
          <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <h1 className="text-2xl font-black tracking-[0.15em]">{s.company_name || "—"}</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Bienvenido</p>
      </div>
    </Phone>
  );

  const LanguagePreview = () => {
    const logoLang = (s as any).logo_language_url || s.logo_main_url;
    return (
      <Phone>
        <div className="h-full flex flex-col" style={{ color: s.text_color }}>
          <div className="flex flex-col items-center pt-8 pb-4 px-4">
            {logoLang ? <img src={logoLang} alt="" className="max-w-[180px] max-h-[120px] object-contain" /> :
              <div className="w-32 h-24 rounded-xl bg-muted" />}
          </div>
          <div className="px-4 text-center"><h2 className="text-base font-black">Escolha seu idioma</h2></div>
          <div className="flex-1 flex items-center justify-center px-3 gap-2">
            {["🇪🇸","🇧🇷","🇬🇧","🇫🇷"].map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-3xl">{f}</div>
                <span className="text-[10px] font-black">{["ES","PT","EN","FR"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>
    );
  };

  const OrderTypePreview = () => {
    const logoOt = (s as any).logo_order_type_url || s.logo_main_url;
    return (
      <Phone>
        <div className="h-full flex flex-col" style={{ color: s.text_color }}>
          <div className="flex flex-col items-center pt-6 pb-3 px-4">
            {logoOt ? <img src={logoOt} alt="" className="max-w-[160px] max-h-[100px] object-contain" /> :
              <div className="w-28 h-20 rounded-xl bg-muted" />}
          </div>
          <div className="px-4 text-center">
            <h2 className="text-sm font-black">¿Cómo deseas hacer tu pedido?</h2>
          </div>
          <div className="flex-1 flex items-center justify-center px-3 gap-2">
            {[
              { url: s.icon_dine_in_url, Icon: UtensilsCrossed, label: "Comer", tint: s.primary_color },
              { url: s.icon_takeaway_url, Icon: ShoppingBag, label: "Levar", tint: s.accent_color },
              { url: (s as any).icon_delivery_url, Icon: Bike, label: "Domicílio", tint: s.cta_color },
            ].map(({ url, Icon, label, tint }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 p-2 rounded-2xl border" style={{ borderColor: tint + "40" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: tint + "20" }}>
                  {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : <Icon className="w-6 h-6" style={{ color: tint }} />}
                </div>
                <span className="text-[10px] font-black text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>
    );
  };

  const HeaderPreview = () => {
    const logoH = (s as any).logo_secondary_url || s.logo_main_url;
    return (
      <Phone>
        <div className="h-full flex flex-col" style={{ background: s.background_color, color: s.text_color }}>
          <div className="h-16 px-4 flex items-center" style={{ background: (s as any).header_color || s.primary_color }}>
            {logoH ? <img src={logoH} alt="" className="max-h-10 object-contain" /> :
              <div className="h-8 w-32 rounded bg-white/20" />}
          </div>
          <div className="p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2 p-3">
            {[1,2,3,4].map(i => <div key={i} className="rounded-xl bg-muted aspect-square" />)}
          </div>
        </div>
      </Phone>
    );
  };

  const BannerPreview = () => (
    <Phone>
      <div className="h-full flex flex-col" style={{ background: s.background_color, color: s.text_color }}>
        <div className="h-12 px-4 flex items-center text-xs font-black" style={{ background: (s as any).header_color || s.primary_color, color: "#fff" }}>
          {s.company_name || "—"}
        </div>
        <div className="p-3">
          {s.banner_home_url ? (
            <img src={s.banner_home_url} alt="" className="w-full h-32 object-cover rounded-xl" />
          ) : (
            <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">
              Banner home aparece aqui
            </div>
          )}
        </div>
        <div className="px-3 space-y-2 flex-1">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-2 items-center p-2 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-20 rounded bg-muted" />
                <div className="h-2 w-12 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );

  const ColorsPreview = () => (
    <Phone>
      <div className="h-full flex flex-col" style={{ background: s.background_color, color: s.text_color }}>
        <div className="h-14 px-4 flex items-center justify-between" style={{ background: (s as any).header_color || s.primary_color, color: "#fff" }}>
          <span className="font-black text-sm">{s.company_name || "—"}</span>
        </div>
        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-base font-black">Paleta em ação</h3>
          <button className="w-full p-3 rounded-2xl text-white font-bold text-sm" style={{ background: s.primary_color }}>Primária</button>
          <button className="w-full p-3 rounded-2xl font-bold text-sm" style={{ background: s.accent_color, color: s.text_color }}>Destaque</button>
          <button className="w-full p-3 rounded-2xl text-white font-bold text-sm" style={{ background: s.cta_color }}>CTA — Pagar</button>
          <div className="rounded-2xl border p-3 text-xs">Card com texto e cor de fundo.</div>
        </div>
      </div>
    </Phone>
  );

  // ----- tab content config -----
  const tabs = [
    { value: "splash", label: "Splash", icon: Sparkles, preview: <SplashPreview /> },
    { value: "language", label: "Idioma", icon: Languages, preview: <LanguagePreview /> },
    { value: "orderType", label: "Tipo de pedido", icon: ListOrdered, preview: <OrderTypePreview /> },
    { value: "header", label: "Header", icon: Monitor, preview: <HeaderPreview /> },
    { value: "banner", label: "Banner home", icon: ImageIcon, preview: <BannerPreview /> },
    { value: "colors", label: "Cores", icon: Palette, preview: <ColorsPreview /> },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> Identidade Visual</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha a tela à esquerda e veja a pré-visualização ao vivo à direita.</p>
        </div>
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <Label>Nome do estabelecimento</Label>
          <Input value={s.company_name} onChange={(e) => update("company_name", e.target.value)} className="mt-1 max-w-md" />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
          {/* Editor */}
          <div>
            <TabsContent value="splash" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Logo da tela Splash</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Logo principal (modo claro)" field="logo_main_url" dimensions="512×512 px" />
                  <ImageField label="Logo principal (modo escuro)" field={"logo_main_dark_url" as keyof Settings} dimensions="512×512 px" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Logo da tela de escolha de idioma</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Logo (modo claro)" field={"logo_language_url" as keyof Settings} dimensions="512×512 px" />
                  <ImageField label="Logo (modo escuro)" field={"logo_language_dark_url" as keyof Settings} dimensions="512×512 px" />
                  <p className="text-xs text-muted-foreground">As bandeiras/ícones dos idiomas são editados em <strong>Idiomas</strong>.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orderType" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Logo da tela "Como pedir"</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Logo (modo claro)" field={"logo_order_type_url" as keyof Settings} dimensions="512×512 px" />
                  <ImageField label="Logo (modo escuro)" field={"logo_order_type_dark_url" as keyof Settings} dimensions="512×512 px" />
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-base">Ícones do tipo de pedido</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Comer no local" field="icon_dine_in_url" dimensions="500×500 px" />
                  <ImageField label="Para levar" field="icon_takeaway_url" dimensions="500×500 px" />
                  <ImageField label="A domicílio" field={"icon_delivery_url" as keyof Settings} dimensions="500×500 px" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="header" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Logo horizontal (barra superior)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Logo horizontal (modo claro)" field="logo_secondary_url" dimensions="600×160 px" />
                  <ImageField label="Logo horizontal (modo escuro)" field={"logo_secondary_dark_url" as keyof Settings} dimensions="600×160 px" />
                  <ColorField label="Cor da barra superior" field={"header_color" as keyof Settings} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banner" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Banner da home (cardápio)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ImageField label="Banner home" field="banner_home_url" dimensions="1080×500 px" />
                  <p className="text-xs text-muted-foreground">
                    Para múltiplos banners rotativos com vídeo/imagem, use a aba <strong>Banners</strong> no menu lateral.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Paleta de cores</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <ColorField label="Primária" field="primary_color" />
                  <ColorField label="Secundária" field="secondary_color" />
                  <ColorField label="Destaque" field="accent_color" />
                  <ColorField label="CTA (botão pagar)" field="cta_color" />
                  <ColorField label="Fundo" field="background_color" />
                  <ColorField label="Texto" field="text_color" />
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Preview contextual */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" /> Pré-visualização ao vivo
            </div>
            {tabs.find((t) => t.value === tab)?.preview}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default BrandingPage;
