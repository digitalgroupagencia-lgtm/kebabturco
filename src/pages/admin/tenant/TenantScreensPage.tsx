import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Layout, Smartphone, Image as ImageIcon, Languages, Store, UtensilsCrossed, ExternalLink, RefreshCw } from "lucide-react";

type ScreenKey = "splash" | "language" | "storeSelect" | "orderType" | "home";

const screens: { key: ScreenKey; label: string; icon: any }[] = [
  { key: "splash", label: "Splash (carregamento)", icon: ImageIcon },
  { key: "language", label: "Escolha de idioma", icon: Languages },
  { key: "storeSelect", label: "Escolha da unidade", icon: Store },
  { key: "orderType", label: "Tipo de pedido", icon: Layout },
  { key: "home", label: "Cardápio (home)", icon: UtensilsCrossed },
];

const TenantScreensPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<{ id: string; slug: string; custom_domain: string | null } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ScreenKey>("splash");
  const [saving, setSaving] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      const { data: t } = await supabase.from("tenants").select("id, slug, custom_domain").eq("slug", slug).maybeSingle();
      if (!t) { setLoading(false); return; }
      setTenant(t as any);
      const { data: s } = await supabase.from("stores").select("id").eq("tenant_id", t.id).order("sort_order").limit(1).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStoreId(s.id);
      const { data: cfg } = await supabase.from("totem_config").select("*").eq("store_id", s.id).maybeSingle();
      setConfig(cfg || { store_id: s.id, screen_config: {} });
      setLoading(false);
    };
    load();
  }, [slug]);

  const save = async () => {
    if (!storeId || !config) return;
    setSaving(true);
    const payload = {
      store_id: storeId,
      enable_dine_in: config.enable_dine_in ?? true,
      enable_takeaway: config.enable_takeaway ?? true,
      enable_delivery: config.enable_delivery ?? false,
    };
    const { error } = await supabase.from("totem_config").upsert(payload, { onConflict: "store_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Telas atualizadas"); setIframeKey((k) => k + 1); }
  };

  const setField = (k: string, v: any) => setConfig((p: any) => ({ ...p, [k]: v }));

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Carregando...</div>;
  if (!config) return <div className="p-8">Crie uma unidade primeiro.</div>;

  const baseUrl = tenant?.custom_domain ? `https://${tenant.custom_domain}` : window.location.origin;
  const previewUrl = `${baseUrl}/?tenant=${tenant?.slug}&screen=${active}&preview=1`;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layout className="h-6 w-6" /> Telas do totem</h1>
        <p className="text-sm text-muted-foreground">Pré-visualização ao vivo da tela real do totem deste cliente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        {/* Painel esquerdo: lista + editor */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {screens.map((s) => (
              <Button
                key={s.key}
                variant={active === s.key ? "default" : "outline"}
                size="sm"
                className="h-auto py-2 flex-col gap-1"
                onClick={() => setActive(s.key)}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-[11px] leading-tight text-center">{s.label}</span>
              </Button>
            ))}
          </div>

          <Card className="p-4 space-y-3">
            {active === "splash" && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  A tela <strong>Splash</strong> mostra o logo principal e o nome do cliente. Para alterá-los, use:
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tenants/${slug}/branding`)}>
                  Editar logo e nome em Marca →
                </Button>
              </div>
            )}
            {active === "language" && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Idiomas, bandeiras e textos são configurados em Idiomas.</p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tenants/${slug}/languages`)}>
                  Editar idiomas →
                </Button>
              </div>
            )}
            {active === "storeSelect" && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Esta tela aparece automaticamente quando o cliente tem 2+ unidades. Edite nome, endereço e foto de cada unidade.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tenants/${slug}/stores`)}>
                  Editar unidades →
                </Button>
              </div>
            )}
            {active === "orderType" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Quais opções de pedido o cliente pode escolher?</p>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_dine_in ?? true} onCheckedChange={(v) => setField("enable_dine_in", v)} /> Comer no local
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_takeaway ?? true} onCheckedChange={(v) => setField("enable_takeaway", v)} /> Para levar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_delivery ?? false} onCheckedChange={(v) => setField("enable_delivery", v)} /> A domicílio
                </label>
                <Button onClick={save} disabled={saving} className="w-full mt-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            )}
            {active === "home" && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  O cardápio é gerado a partir das categorias e produtos cadastrados.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/panel/menu`)}>
                  Editar cardápio →
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Painel direito: preview ao vivo (iframe do totem real) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-4 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Preview ao vivo (totem real)</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIframeKey((k) => k + 1)} title="Recarregar">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Abrir em nova aba">
                  <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
              </div>
            </div>
            <div
              className="mx-auto rounded-[2rem] border-8 border-foreground/90 overflow-hidden shadow-xl bg-background"
              style={{ width: 320, height: 640 }}
            >
              <iframe
                key={`${active}-${iframeKey}`}
                src={previewUrl}
                title="Preview do totem"
                className="w-full h-full border-0"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TenantScreensPage;