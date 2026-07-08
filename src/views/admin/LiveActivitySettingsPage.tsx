import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Smartphone, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { fetchStaffPushToStartTokenCount } from "@/lib/push/pushTestService";
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
  const [laTokenCount, setLaTokenCount] = useState<number | null>(null);
  const [checkingTokens, setCheckingTokens] = useState(false);

  const refreshTokenStatus = async () => {
    if (!storeId) return;
    setCheckingTokens(true);
    setLaTokenCount(await fetchStaffPushToStartTokenCount(storeId));
    setCheckingTokens(false);
  };

  useEffect(() => {
    if (!storeId) return;
    void refreshTokenStatus();
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
          <Card className={laTokenCount && laTokenCount > 0 ? "border-emerald-500/40" : "border-amber-500/50"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {laTokenCount && laTokenCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                Estado do cartão grande (ACEITAR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                <strong>Não há botão para ligar isto no admin.</strong> O cartão grande depende do iPhone da equipa
                estar registado na base de dados. A faixa pequena pode funcionar mesmo sem isto.
              </p>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                {laTokenCount === null || checkingTokens ? (
                  <p>A verificar iPhones registados…</p>
                ) : laTokenCount > 0 ? (
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {laTokenCount} iPhone(s) registado(s) para cartão no ecrã bloqueado nesta loja.
                  </p>
                ) : laTokenCount === -1 ? (
                  <p className="text-amber-700 dark:text-amber-400">
                    Não foi possível ler a base de dados — corre o script LIVE_ACTIVITY_FULL.sql no Supabase.
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-400 font-medium">
                    Nenhum iPhone registado para cartão grande. Só vai chegar a notificação antiga (faixa pequena).
                  </p>
                )}
              </div>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <strong>Supabase (uma vez):</strong> corre o ficheiro LIVE_ACTIVITY_FULL.sql no SQL Editor.
                </li>
                <li>
                  <strong>Lovable:</strong> Publish (para o servidor e a app web actualizados).
                </li>
                <li>
                  <strong>iPhone da equipa:</strong> app Kebab Turco 1.1.6, iOS 17.2+, entrar no Painel com login,
                  Definições → desligar e ligar «Notificações push», fechar a app.
                </li>
                <li>
                  <strong>Teste:</strong> no painel ao vivo, «Enviar alerta» no pedido — com ecrã bloqueado deve
                  aparecer o cartão vermelho com ACEITAR.
                </li>
              </ol>
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshTokenStatus()} disabled={checkingTokens}>
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingTokens ? "animate-spin" : ""}`} />
                Actualizar estado
              </Button>
            </CardContent>
          </Card>

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
