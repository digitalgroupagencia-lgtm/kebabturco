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
import { Monitor, Palette, Globe, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TotemConfig = Tables<"totem_config">;

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
  const [primaryColor, setPrimaryColor] = useState("#D62300");
  const [secondaryColor, setSecondaryColor] = useState("#F5F5F5");
  const [accentColor, setAccentColor] = useState("#FFC72C");
  const [ctaColor, setCtaColor] = useState("#28A745");
  const [enableDineIn, setEnableDineIn] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [welcomePt, setWelcomePt] = useState("");
  const [welcomeEn, setWelcomeEn] = useState("");

  useEffect(() => {
    if (storeId) fetchConfig();
  }, [storeId]);

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
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!storeId) return;
    setSaving(true);

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

  return (
    <div className="space-y-6 max-w-3xl">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>URL do Logo</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Imagem de Fundo</Label>
              <Input value={bgImageUrl} onChange={(e) => setBgImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

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
    </div>
  );
};

export default TotemConfigPage;
