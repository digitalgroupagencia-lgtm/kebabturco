import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Smartphone } from "lucide-react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  DEFAULT_LIVE_ACTIVITY_SETTINGS,
  mergeLiveActivitySettings,
  type LiveActivitySettings,
} from "@/lib/liveActivitySettings";

const LiveActivitySettingsPage = () => {
  const { storeId, loading: loadingStore } = useAdminStoreId();
  const [s, setS] = useState<LiveActivitySettings>(DEFAULT_LIVE_ACTIVITY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    void supabase
      .from("operations_settings")
      .select(
        "la_staff_card_title, la_customer_card_title, la_staff_new_message, la_staff_urgent_message, la_customer_ready_message, la_color_normal, la_color_urgent, la_urgent_after_minutes",
      )
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Não foi possível carregar as definições dos cartões.");
        setS(mergeLiveActivitySettings(data as Partial<LiveActivitySettings> | null));
        setLoading(false);
      });
  }, [storeId]);

  const save = async () => {
    if (!storeId) return;
    setSaving(true);
    const payload = { ...s, store_id: storeId, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("operations_settings").upsert(payload, { onConflict: "store_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar. Confirme que correu o script LIVE_ACTIVITY_FULL.sql no Supabase.");
      return;
    }
    toast.success("Cartões actualizados — entram em vigor de imediato, sem nova versão da app.");
  };

  const field = (key: keyof LiveActivitySettings, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Input
        id={key}
        type={key.includes("color") ? "color" : key.includes("minutes") ? "number" : "text"}
        min={key.includes("minutes") ? 1 : undefined}
        max={key.includes("minutes") ? 120 : undefined}
        value={String(s[key])}
        onChange={(e) =>
          setS((prev) => ({
            ...prev,
            [key]: key.includes("minutes") ? Number(e.target.value) : e.target.value,
          }))
        }
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <PremiumPageHeader
        title="Cartões no ecrã"
        subtitle="Personalize textos e cores dos cartões da equipa e do cliente. As alterações aplicam-se de imediato."
        icon={Smartphone}
      />

      {loadingStore || loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipa — pedido novo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("la_staff_card_title", "Título do cartão")}
              {field("la_staff_new_message", "Mensagem de pedido novo")}
              {field("la_staff_urgent_message", "Mensagem urgente")}
              {field("la_urgent_after_minutes", "Minutos até modo urgente", "Ex.: 5 = cartão fica vermelho após 5 min")}
              {field("la_color_normal", "Cor normal")}
              {field("la_color_urgent", "Cor urgente")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente — acompanhar pedido</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("la_customer_card_title", "Título do cartão")}
              {field("la_customer_ready_message", "Mensagem quando está pronto")}
            </CardContent>
          </Card>

          <Button onClick={() => void save()} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "A guardar…" : "Guardar cartões"}
          </Button>
        </>
      )}
    </div>
  );
};

export default LiveActivitySettingsPage;
