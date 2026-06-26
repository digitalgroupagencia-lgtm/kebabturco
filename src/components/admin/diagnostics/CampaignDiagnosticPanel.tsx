import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { campaignDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import {
  CAMPAIGN_PRESETS,
  countMarketingSubscribers,
  fetchCampaignSendLog,
  fetchStoreCampaigns,
  sendMarketingBroadcast,
  simulateCampaignRun,
  upsertCampaignPreset,
  type CampaignRow,
  type CampaignSendLogRow,
} from "@/lib/diagnostics/campaignPushService";
import { supabase } from "@/integrations/supabase/client";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

export default function CampaignDiagnosticPanel() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => campaignDiagnosticLogger.getLogs());
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [sendLog, setSendLog] = useState<CampaignSendLogRow[]>([]);
  const [title, setTitle] = useState("Promo hoje!");
  const [body, setBody] = useState("Desconto especial só hoje, peça já.");
  const [url, setUrl] = useState("/");
  const [target, setTarget] = useState<"all" | "this_device">("all");
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setRefreshing(true);
    const [subs, camps, logRows] = await Promise.all([
      countMarketingSubscribers(storeId),
      fetchStoreCampaigns(storeId),
      fetchCampaignSendLog(storeId),
    ]);
    setSubscriberCount(subs);
    setCampaigns(camps);
    setSendLog(logRows);
    setRefreshing(false);
  }, [storeId]);

  useEffect(() => {
    void refresh();
    return campaignDiagnosticLogger.subscribe(() => setLogs(campaignDiagnosticLogger.getLogs()));
  }, [refresh]);

  const handleBroadcast = async () => {
    if (!storeId) return;
    setSending(true);
    const result = await sendMarketingBroadcast({ storeId, title, body, url, target });
    setSending(false);
    if (result.ok) toast.success(`Enviado para ${result.sent ?? 0} dispositivo(s)`);
    else toast.error(result.userMessage ?? result.error ?? "Falha no envio");
    void refresh();
  };

  const applyPreset = async (key: string) => {
    if (!storeId) return;
    const preset = CAMPAIGN_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setTitle(preset.title.pt);
    setBody(preset.message.pt);
    const r = await upsertCampaignPreset(storeId, preset);
    if (r.ok) {
      toast.success(`Campanha «${preset.name}» guardada`);
      void refresh();
    } else toast.error(r.error ?? "Erro");
  };

  const toggleCampaign = async (c: CampaignRow) => {
    await supabase.from("marketing_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    void refresh();
  };

  const runSimulate = async () => {
    if (!storeId) return;
    setSimulating(true);
    const r = await simulateCampaignRun(storeId, undefined, true);
    setSimulating(false);
    if (r.ok) toast.success(`Simulação: ${JSON.stringify(r.data)}`);
    else toast.error(r.error ?? "Motor indisponível, aplique migration e deploy");
  };

  return (
    <AdminDiagnosticShell
      title="Campanhas push"
      description="Envio imediato a todos os clientes e agenda após 1.ª compra."
      icon={<Megaphone className="h-5 w-5 text-primary" />}
      storeSwitcher={<AdminStoreSwitcher />}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      statusCards={
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{subscriberCount}</p>
              <p className="text-xs text-muted-foreground">subscritores marketing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{campaigns.filter((c) => c.is_active).length}</p>
              <p className="text-xs text-muted-foreground">campanhas activas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{sendLog.length}</p>
              <p className="text-xs text-muted-foreground">envios registados (recentes)</p>
            </CardContent>
          </Card>
        </div>
      }
      testSection={
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Envio imediato
              </CardTitle>
              <CardDescription>Promo relâmpago, todos os clientes com push activo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select value={target} onValueChange={(v) => setTarget(v as "all" | "this_device")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes ({subscriberCount})</SelectItem>
                    <SelectItem value="this_device">Este browser (teste)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Input value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL ao tocar</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <Button disabled={sending || !storeId} onClick={() => void handleBroadcast()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar agora
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Agenda (após 1.ª compra)
              </CardTitle>
              <CardDescription>Presets + motor diário run-marketing-campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_PRESETS.map((p) => (
                  <Button key={p.key} variant="outline" size="sm" onClick={() => void applyPreset(p.key)}>
                    {p.name}
                  </Button>
                ))}
              </div>
              <Button variant="secondary" disabled={simulating || !storeId} onClick={() => void runSimulate()}>
                {simulating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simular motor (dry-run)
              </Button>
              <ul className="space-y-2">
                {campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.trigger_event ?? "first_order"} · {c.trigger_days ?? ", "} dias · {c.title ?? c.message_template.slice(0, 40)}
                      </p>
                    </div>
                    <Switch checked={c.is_active} onCheckedChange={() => void toggleCampaign(c)} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      }
      logsPanel={
        <>
          {sendLog.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de envios</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {sendLog.map((row) => (
                    <li key={row.id} className="flex justify-between border-b py-1 gap-2">
                      <span>{row.customer_phone}</span>
                      <span className={row.status === "sent" ? "text-emerald-600" : "text-destructive"}>
                        {row.status}
                      </span>
                      <span className="text-muted-foreground">{new Date(row.sent_at).toLocaleString("pt-PT")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <AdminDiagnosticLogPanel
            title="Logs de campanhas"
            logs={logs}
            onClear={() => {
              campaignDiagnosticLogger.clearLogs();
              setLogs([]);
            }}
          />
        </>
      }
    />
  );
}
