import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Layout, Smartphone, Image as ImageIcon, Languages, Store, UtensilsCrossed } from "lucide-react";

type ScreenKey = "splash" | "language" | "store" | "order_type" | "home";

const screens: { key: ScreenKey; label: string; icon: any }[] = [
  { key: "splash", label: "Splash (carregamento)", icon: ImageIcon },
  { key: "language", label: "Escolha de idioma", icon: Languages },
  { key: "store", label: "Escolha da unidade", icon: Store },
  { key: "order_type", label: "Tipo de pedido", icon: Layout },
  { key: "home", label: "Cardápio (home)", icon: UtensilsCrossed },
];

const TenantScreensPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ScreenKey>("splash");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      const { data: t } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!t) { setLoading(false); return; }
      const { data: s } = await supabase.from("stores").select("id").eq("tenant_id", t.id).order("sort_order").limit(1).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStoreId(s.id);
      const { data: cfg } = await supabase.from("totem_config").select("*").eq("store_id", s.id).maybeSingle();
      setConfig(cfg || { store_id: s.id, screen_config: {} });
      setLoading(false);
    };
    load();
  }, [slug]);

  const lang = config?.primary_language || "pt";

  const save = async () => {
    if (!storeId || !config) return;
    setSaving(true);
    const payload = {
      store_id: storeId,
      splash_title: config.splash_title || {},
      splash_subtitle: config.splash_subtitle || {},
      splash_show_text: config.splash_show_text ?? true,
      splash_logo_url: config.splash_logo_url,
      splash_logo_size: config.splash_logo_size || 160,
      welcome_message: config.welcome_message || {},
      enable_dine_in: config.enable_dine_in ?? true,
      enable_takeaway: config.enable_takeaway ?? true,
      enable_delivery: config.enable_delivery ?? false,
      screen_config: config.screen_config || {},
    };
    const { error } = await supabase.from("totem_config").upsert(payload, { onConflict: "store_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Telas atualizadas");
  };

  const setField = (k: string, v: any) => setConfig((p: any) => ({ ...p, [k]: v }));
  const setI18n = (k: string, v: string) => setConfig((p: any) => ({ ...p, [k]: { ...(p?.[k] || {}), [lang]: v } }));

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Carregando...</div>;
  if (!config) return <div className="p-8">Crie uma unidade primeiro.</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layout className="h-6 w-6" /> Telas do totem</h1>
        <p className="text-sm text-muted-foreground">Edite cada tela e veja em tempo real ao lado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel esquerdo: lista + editor */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {screens.map((s) => (
              <Button
                key={s.key}
                variant={active === s.key ? "default" : "outline"}
                size="sm"
                className="h-auto py-2 flex-col gap-1"
                onClick={() => setActive(s.key)}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-xs">{s.label}</span>
              </Button>
            ))}
          </div>

          <Card className="p-4 space-y-3">
            {active === "splash" && (
              <>
                <div>
                  <Label>Título da splash ({lang})</Label>
                  <Input value={config.splash_title?.[lang] || ""} onChange={(e) => setI18n("splash_title", e.target.value)} />
                </div>
                <div>
                  <Label>Subtítulo ({lang})</Label>
                  <Textarea rows={2} value={config.splash_subtitle?.[lang] || ""} onChange={(e) => setI18n("splash_subtitle", e.target.value)} />
                </div>
                <div>
                  <Label>URL do logo na splash</Label>
                  <Input value={config.splash_logo_url || ""} onChange={(e) => setField("splash_logo_url", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>Tamanho do logo (px): {config.splash_logo_size || 160}</Label>
                  <Input type="range" min="80" max="320" value={config.splash_logo_size || 160} onChange={(e) => setField("splash_logo_size", Number(e.target.value))} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.splash_show_text ?? true} onCheckedChange={(v) => setField("splash_show_text", v)} /> Mostrar textos
                </label>
              </>
            )}
            {active === "language" && (
              <div className="text-sm text-muted-foreground">
                Idiomas e ícones são configurados em <strong>Idiomas</strong> no menu lateral.
              </div>
            )}
            {active === "store" && (
              <div className="text-sm text-muted-foreground">
                Esta tela aparece automaticamente quando o tenant tem 2+ unidades. Edite as unidades em <strong>Unidades</strong>.
              </div>
            )}
            {active === "order_type" && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_dine_in ?? true} onCheckedChange={(v) => setField("enable_dine_in", v)} /> Comer no local
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_takeaway ?? true} onCheckedChange={(v) => setField("enable_takeaway", v)} /> Para levar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={config.enable_delivery ?? false} onCheckedChange={(v) => setField("enable_delivery", v)} /> A domicílio
                </label>
              </>
            )}
            {active === "home" && (
              <div>
                <Label>Mensagem de boas-vindas no cardápio ({lang})</Label>
                <Input value={config.welcome_message?.[lang] || ""} onChange={(e) => setI18n("welcome_message", e.target.value)} />
              </div>
            )}

            <Button onClick={save} disabled={saving} className="w-full mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar tela"}
            </Button>
          </Card>
        </div>

        {/* Painel direito: preview ao vivo */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-4 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Preview ao vivo</div>
            <div
              className="mx-auto rounded-[2rem] border-8 border-foreground/90 overflow-hidden shadow-xl bg-background"
              style={{ width: 280, height: 560 }}
            >
              <ScreenPreview screen={active} config={config} lang={lang} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

function ScreenPreview({ screen, config, lang }: { screen: ScreenKey; config: any; lang: string }) {
  const bg = config.primary_color || "#D62300";
  const cta = config.cta_color || "#28A745";

  if (screen === "splash") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: bg, color: "#fff" }}>
        {config.splash_logo_url ? (
          <img src={config.splash_logo_url} alt="" style={{ width: config.splash_logo_size || 160 }} />
        ) : (
          <div className="bg-white/20 rounded-full" style={{ width: config.splash_logo_size || 160, height: config.splash_logo_size || 160 }} />
        )}
        {(config.splash_show_text ?? true) && (
          <>
            <div className="text-xl font-bold">{config.splash_title?.[lang] || "Bem-vindo"}</div>
            <div className="text-sm opacity-90">{config.splash_subtitle?.[lang] || "Toque para começar"}</div>
          </>
        )}
      </div>
    );
  }
  if (screen === "language") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6" style={{ background: bg, color: "#fff" }}>
        <div className="text-lg font-bold mb-2">Escolha o idioma</div>
        {["pt","en","es","fr"].map((l) => (
          <button key={l} className="w-full py-3 rounded-xl bg-white/15 text-sm uppercase">{l}</button>
        ))}
      </div>
    );
  }
  if (screen === "store") {
    return (
      <div className="h-full w-full flex flex-col gap-3 p-6" style={{ background: bg, color: "#fff" }}>
        <div className="text-lg font-bold text-center mb-2">Escolha a unidade</div>
        {["Gandia","Playa de Gandia"].map((n) => (
          <div key={n} className="rounded-xl bg-white/15 p-4">
            <div className="font-semibold">{n}</div>
            <div className="text-xs opacity-80">Toque para continuar</div>
          </div>
        ))}
      </div>
    );
  }
  if (screen === "order_type") {
    return (
      <div className="h-full w-full flex flex-col gap-3 p-6" style={{ background: bg, color: "#fff" }}>
        <div className="text-lg font-bold text-center mb-2">Tipo de pedido</div>
        {config.enable_dine_in && <button className="py-4 rounded-xl bg-white/15">Comer no local</button>}
        {config.enable_takeaway && <button className="py-4 rounded-xl bg-white/15">Para levar</button>}
        {config.enable_delivery && <button className="py-4 rounded-xl" style={{ background: cta }}>A domicílio</button>}
      </div>
    );
  }
  return (
    <div className="h-full w-full flex flex-col gap-3 p-4 bg-background">
      <div className="text-sm font-semibold">{config.welcome_message?.[lang] || "Cardápio"}</div>
      <div className="grid grid-cols-2 gap-2">
        {[1,2,3,4].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default TenantScreensPage;