import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Palette, Image as ImageIcon, Save,
  Languages, ListOrdered, Sparkles, Loader2, Monitor, UtensilsCrossed, CreditCard, Globe,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import TenantLivePreview from "@/components/admin/TenantLivePreview";
import type { TenantPreviewScreen } from "@/lib/tenantPreview";
import ImageUploadField from "@/components/panel/ImageUploadField";

type Settings = Tables<"company_settings">;

const TAB_SCREEN: Record<string, TenantPreviewScreen> = {
  splash: "splash",
  site: "splash",
  language: "language",
  orderType: "orderType",
  header: "home",
  banner: "home",
  menu: "home",
  colors: "home",
  product: "product",
  checkout: "payment",
};

const BrandingPage = () => {
  const { storeId: STORE_ID, loading: loadingStore } = useAdminStoreId();
  const { tenant } = useSelectedTenant();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<keyof Settings | null>(null);
  const [tab, setTab] = useState("splash");
  const [sampleProductId, setSampleProductId] = useState<string | null>(null);
  const draftPreview = useDebouncedValue(s, 180);

  useEffect(() => { if (STORE_ID) load(); }, [STORE_ID]);

  useEffect(() => {
    if (!STORE_ID) return;
    supabase
      .from("products")
      .select("id")
      .eq("store_id", STORE_ID)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSampleProductId(data?.id ?? null));
  }, [STORE_ID]);

  const previewTenant = useMemo(() => {
    if (!tenant?.slug) return null;
    return {
      slug: tenant.slug,
      name: tenant.name,
      custom_domain: tenant.custom_domain,
      path_slug: tenant.path_slug,
      master_domain: tenant.master_domain,
      use_master_domain: tenant.use_master_domain,
    };
  }, [tenant]);

  const previewScreen = TAB_SCREEN[tab] ?? "splash";

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
    setUploadingField(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `${STORE_ID}/${String(field)}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) { toast.error("Erro ao subir: " + error.message); return; }
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      update(field, pub.publicUrl);
      toast.success("Imagem carregada — lembra de salvar");
    } finally {
      setUploadingField(null);
    }
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
      short_name: (s as any).short_name,
      meta_description: (s as any).meta_description,
      favicon_url: (s as any).favicon_url,
      icon_192_url: (s as any).icon_192_url,
      icon_512_url: (s as any).icon_512_url,
      apple_touch_icon_url: (s as any).apple_touch_icon_url,
      og_image_url: (s as any).og_image_url,
    }).eq("store_id", STORE_ID);
    setSaving(false);
    if (error) toast.error("Erro ao salvar"); else toast.success("Identidade visual atualizada!");
  };

  if (loadingStore || !s) {
    return <div className="p-8 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>;
  }

  const ImageField = ({ label, field, dimensions }: { label: string; field: keyof Settings; dimensions?: string }) => {
    const url = (s as any)[field] as string | null;
    return (
      <ImageUploadField
        label={label}
        dimensions={dimensions}
        value={url || ""}
        uploading={uploadingField === field}
        onPickFile={(file) => upload(field, file)}
      />
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

  const tabs = [
    { value: "splash", label: "Splash", icon: Sparkles },
    { value: "site", label: "Site & telemóvel", icon: Globe },
    { value: "language", label: "Idioma", icon: Languages },
    { value: "orderType", label: "Tipo pedido", icon: ListOrdered },
    { value: "header", label: "Header", icon: Monitor },
    { value: "banner", label: "Banner", icon: ImageIcon },
    { value: "menu", label: "Cardápio", icon: UtensilsCrossed },
    { value: "product", label: "Produto", icon: UtensilsCrossed },
    { value: "checkout", label: "Checkout", icon: CreditCard },
    { value: "colors", label: "Cores", icon: Palette },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> Identidade Visual</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pré-visualização do site real{tenant?.custom_domain ? ` em ${tenant.custom_domain}` : ""}. Alterações reflectem-se ao vivo antes de guardar.
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-4">
          <div>
            <TabsContent value="splash" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Logo da tela Splash</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome do estabelecimento</Label>
                    <Input value={s.company_name} onChange={(e) => update("company_name", e.target.value)} className="mt-1 max-w-md" />
                  </div>
                  <ImageField label="Logo principal (modo claro)" field="logo_main_url" dimensions="512×512 px" />
                  <ImageField label="Logo principal (modo escuro)" field={"logo_main_dark_url" as keyof Settings} dimensions="512×512 px" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="site" className="space-y-4 mt-0">
              <Card><CardHeader><CardTitle className="text-base">Nome e ícones no browser e telemóvel</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome curto (ícone no telemóvel)</Label>
                    <Input
                      value={(s as any).short_name || ""}
                      onChange={(e) => update("short_name" as keyof Settings, e.target.value)}
                      placeholder={s.company_name || "Ex.: Kebab Turco"}
                      className="mt-1 max-w-md"
                    />
                  </div>
                  <div>
                    <Label>Descrição (Google / partilhas)</Label>
                    <Input
                      value={(s as any).meta_description || ""}
                      onChange={(e) => update("meta_description" as keyof Settings, e.target.value)}
                      placeholder="Peça online em..."
                      className="mt-1"
                    />
                  </div>
                  <ImageField label="Ícone do separador do browser" field={"favicon_url" as keyof Settings} dimensions="48×48 px" />
                  <ImageField label="Ícone telemóvel 192" field={"icon_192_url" as keyof Settings} dimensions="192×192 px" />
                  <ImageField label="Ícone telemóvel 512" field={"icon_512_url" as keyof Settings} dimensions="512×512 px" />
                  <ImageField label="Ícone iPhone (ecrã inicial)" field={"apple_touch_icon_url" as keyof Settings} dimensions="180×180 px" />
                  <ImageField label="Imagem de partilha (WhatsApp, etc.)" field={"og_image_url" as keyof Settings} dimensions="1200×630 px" />
                  <p className="text-xs text-muted-foreground">
                    Se deixar vazio, usa o logo principal da aba Splash.
                  </p>
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
              <Card><CardHeader><CardTitle className="text-base">Logo da tela &quot;Como pedir&quot;</CardTitle></CardHeader>
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

            <TabsContent value="menu" className="space-y-4 mt-0">
              <Card><CardContent className="p-4 text-sm text-muted-foreground">
                A pré-visualização mostra o cardápio real com produtos e categorias deste restaurante.
                Edite produtos em <strong>Cardápio</strong> no menu lateral.
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="product" className="space-y-4 mt-0">
              <Card><CardContent className="p-4 text-sm text-muted-foreground">
                Pré-visualização da página de produto com o primeiro item disponível do cardápio.
                {!sampleProductId && " Cadastre pelo menos um produto activo."}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="checkout" className="space-y-4 mt-0">
              <Card><CardContent className="p-4 text-sm text-muted-foreground">
                Pré-visualização do pagamento com um produto de exemplo no carrinho (só na prévia, não afecta pedidos reais).
              </CardContent></Card>
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

          <div className="xl:sticky xl:top-4 xl:self-start">
            <TenantLivePreview
              tenant={previewTenant}
              screen={previewScreen}
              productId={previewScreen === "product" ? sampleProductId : null}
              seedCheckout={previewScreen === "payment"}
              draftSettings={draftPreview}
            />
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default BrandingPage;
