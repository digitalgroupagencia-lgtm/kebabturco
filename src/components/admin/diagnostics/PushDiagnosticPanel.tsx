import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Send, AlertTriangle } from "lucide-react";
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
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import AdminDiagnosticShell from "@/components/admin/diagnostics/AdminDiagnosticShell";
import AdminDiagnosticLogPanel from "@/components/admin/diagnostics/AdminDiagnosticLogPanel";
import AdminDiagnosticStatusBadge from "@/components/admin/diagnostics/AdminDiagnosticStatusBadge";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { subscribeStaffPush } from "@/lib/staffPush";
import { subscribeCustomerMarketingPush } from "@/lib/customerMarketingPush";
import { getVapidKeyDiagnostics } from "@/lib/push/pushVapidDiagnostics";
import {
  getBrowserPushSupport,
  probePushServiceWorker,
  type ServiceWorkerDiagnostics,
} from "@/lib/push/pushServiceWorkerProbe";
import { pushDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import {
  sendTestPushNotification,
  fetchServerVapidDiagnostics,
  type PushTestAudience,
  type PushTestSendResult,
  type ServerVapidDiagnostics,
} from "@/lib/push/pushTestService";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { STAFF_PUSH_TAG } from "@/lib/staffPush";
import type { DiagnosticLogEntry } from "@/lib/diagnostics/createDiagnosticLogger";

type Props = {
  embedded?: boolean;
  showStoreSwitcher?: boolean;
};

export default function PushDiagnosticPanel({ embedded, showStoreSwitcher = true }: Props) {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [vapid, setVapid] = useState(() => getVapidKeyDiagnostics());
  const [browser, setBrowser] = useState(() => getBrowserPushSupport());
  const [sw, setSw] = useState<ServiceWorkerDiagnostics | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => pushDiagnosticLogger.getLogs());
  const [serverVapid, setServerVapid] = useState<ServerVapidDiagnostics | null>(null);
  const [localDeviceReady, setLocalDeviceReady] = useState<boolean | null>(null);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [audience, setAudience] = useState<PushTestAudience>("staff");
  const [testTitle, setTestTitle] = useState("Teste push Kebab Turco");
  const [testBody, setTestBody] = useState("Se vês isto, as notificações push estão a funcionar.");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<PushTestSendResult | null>(null);

  const refreshProbe = useCallback(async () => {
    setRefreshing(true);
    setVapid(getVapidKeyDiagnostics());
    setBrowser(getBrowserPushSupport());
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    const swDiag = await probePushServiceWorker("test");
    setSw(swDiag);
    const serverDiag = await fetchServerVapidDiagnostics();
    setServerVapid(serverDiag);
    const local = await getLocalPushSubscription();
    setLocalDeviceReady(Boolean(local));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refreshProbe();
    return pushDiagnosticLogger.subscribe(() => setLogs(pushDiagnosticLogger.getLogs()));
  }, [refreshProbe]);

  const handleSubscribe = async () => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    setSubscribeBusy(true);
    try {
      const result =
        audience === "marketing"
          ? await subscribeCustomerMarketingPush(storeId)
          : await subscribeStaffPush(storeId);
      if (result.ok) {
        toast.success("Este dispositivo está subscrito para push");
        setPermission(Notification.permission);
        setLocalDeviceReady(true);
      } else {
        toast.error(result.error ?? "Falha na subscrição — veja os logs abaixo");
      }
    } finally {
      setSubscribeBusy(false);
    }
  };

  const handleSendTest = async () => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    setSendBusy(true);
    setTestStatus("sending");
    setTestResult(null);
    try {
      const result = await sendTestPushNotification({ storeId, audience, title: testTitle, body: testBody });
      setTestResult(result);
      setTestStatus(result.ok ? "success" : "error");
      if (result.ok) toast.success(`Notificação enviada — ${result.sent ?? 0} dispositivo(s)`);
      else if (result.skipped) toast.error(result.userMessage ?? "Servidor sem chaves VAPID");
      else toast.error(result.userMessage ?? result.error ?? "Falha ao enviar teste");
      void refreshProbe();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTestStatus("error");
      setTestResult({ ok: false, error: message, userMessage: message });
    } finally {
      setSendBusy(false);
    }
  };

  const clientVapidOk = vapid.loaded && vapid.validFormat && vapid.decodable;
  const serverVapidOk = Boolean(serverVapid?.configured);
  const permOk = permission === "granted";
  const canSendTest = serverVapidOk && permOk && Boolean(storeId);
  const testStatusLabel =
    testStatus === "sending"
      ? "A enviar agora…"
      : testStatus === "success"
        ? "Sucesso — notificação enviada"
        : testStatus === "error"
          ? "Erro no envio"
          : "Aguardando teste";

  const alerts = (
    <>
      {serverVapid && !serverVapid.configured ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">O site pode subscrever, mas o servidor ainda não envia</p>
            <p className="text-xs mt-1 opacity-90">
              Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nos segredos da Lovable Cloud.
            </p>
          </div>
        </div>
      ) : null}
      {serverVapid?.configured && serverVapid.keysMatchClient === false ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="font-semibold">Chaves do site e do servidor não coincidem</p>
        </div>
      ) : null}
    </>
  );

  const statusCards = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chave no site</CardTitle>
          <CardDescription>Pública — subscrição neste browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <AdminDiagnosticStatusBadge ok={clientVapidOk} label={clientVapidOk ? "OK" : "Problema"} />
          <p className="text-xs text-muted-foreground font-mono truncate">{vapid.keyPreview}</p>
        </CardContent>
      </Card>
      <Card className={!serverVapidOk ? "border-amber-500/40" : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chave no servidor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {serverVapid === null ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AdminDiagnosticStatusBadge ok={serverVapidOk} label={serverVapidOk ? "Pronto" : "Não configurado"} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Service worker</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDiagnosticStatusBadge
            ok={Boolean(sw?.pushHandlerRegistered)}
            label={sw?.pushHandlerRegistered ? "Registado" : "Não registado"}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Permissões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <AdminDiagnosticStatusBadge ok={permOk} label={String(permission)} />
          <p>PushManager: {browser.pushManagerSupported ? "Sim" : "Não"}</p>
        </CardContent>
      </Card>
    </div>
  );

  const testSection = (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 text-sm space-y-1">
          <p>
            Estado deste browser:{" "}
            {localDeviceReady ? (
              <span className="text-emerald-600 font-semibold">registado</span>
            ) : (
              <span className="text-amber-600 font-semibold">não registado</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Equipa → {STAFF_PUSH_TAG} · Cliente → {CUSTOMER_MARKETING_PUSH_TAG}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testar neste dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as PushTestAudience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Equipa</SelectItem>
                  <SelectItem value="marketing">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={subscribeBusy || !storeId} onClick={() => void handleSubscribe()}>
                {subscribeBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                Registar push
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Input value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Resultado em tempo real</span>
              <AdminDiagnosticStatusBadge ok={testStatus === "success"} label={testStatusLabel} />
            </div>
            {testResult ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Enviados: {testResult.sent ?? 0} · Alvos: {testResult.targeted ?? 0} · Encontrados: {testResult.matched ?? 0}
                </p>
                {testResult.userMessage || testResult.error ? (
                  <p className="text-destructive font-medium">{testResult.userMessage ?? testResult.error}</p>
                ) : null}
                {testResult.errors?.length ? (
                  <pre className="whitespace-pre-wrap break-all rounded-md bg-background p-2 text-[10px]">
                    {JSON.stringify(testResult.errors, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">O resultado aparece aqui assim que o servidor responder.</p>
            )}
          </div>
          <Button disabled={sendBusy || !canSendTest} onClick={() => void handleSendTest()}>
            {sendBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar push de teste agora
          </Button>
        </CardContent>
      </Card>
    </>
  );

  const logsPanel = (
    <AdminDiagnosticLogPanel
      title="Logs de push"
      logs={logs}
      onClear={() => {
        pushDiagnosticLogger.clearLogs();
        setLogs([]);
      }}
    />
  );

  if (embedded) {
    return (
      <AdminDiagnosticShell
        title="Push"
        description="Chaves VAPID, service worker e teste neste dispositivo."
        icon={<Bell className="h-5 w-5 text-primary" />}
        alerts={alerts}
        storeSwitcher={showStoreSwitcher ? <AdminStoreSwitcher hint="Escolha a unidade." /> : null}
        refreshing={refreshing}
        onRefresh={() => void refreshProbe()}
        statusCards={statusCards}
        testSection={testSection}
        logsPanel={logsPanel}
      />
    );
  }

  return (
    <AdminDiagnosticShell
      title="Diagnóstico e teste push"
      description="Verifica chaves no site e no servidor, service worker, e envia uma notificação de teste."
      icon={<Bell className="h-6 w-6 text-primary" />}
      alerts={alerts}
      storeSwitcher={showStoreSwitcher ? <AdminStoreSwitcher hint="Escolha a unidade para subscrição e envio." /> : null}
      refreshing={refreshing}
      onRefresh={() => void refreshProbe()}
      statusCards={statusCards}
      testSection={testSection}
      logsPanel={logsPanel}
    />
  );
}
