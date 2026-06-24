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
  sendBroadcastTestPushNotification,
  sendNativeDeviceTestPush,
  fetchServerVapidDiagnostics,
  fetchStoreStaffPushDeviceCounts,
  type PushTestAudience,
  type PushTestSendResult,
  type ServerVapidDiagnostics,
} from "@/lib/push/pushTestService";
import { getLocalDevicePushStatus, type LocalDevicePushStatus } from "@/lib/push/getLocalDevicePushStatus";
import { isNativePushAvailable, getNativePushRuntimeDiagnostics } from "@/services/nativePush";
import type { NativePushRuntimeDiagnostics } from "@/services/nativePush";
import { getStaffPushClientMode } from "@/lib/staffPush";
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
  const [deviceStatus, setDeviceStatus] = useState<LocalDevicePushStatus | null>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [clientMode, setClientMode] = useState<"native" | "web" | "needs-native-app" | "unsupported" | null>(null);
  const [nativeRuntime, setNativeRuntime] = useState<NativePushRuntimeDiagnostics | null>(null);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [audience, setAudience] = useState<PushTestAudience>("staff");
  const [alsoNotifyStaff, setAlsoNotifyStaff] = useState(true);
  const [testTitle, setTestTitle] = useState("Teste push Kebab Turco");
  const [testBody, setTestBody] = useState("Se vês isto, as notificações push estão a funcionar.");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<PushTestSendResult | null>(null);
  const [storeStaffDevices, setStoreStaffDevices] = useState<{ ios: number; android: number; web: number } | null>(
    null,
  );

  const refreshProbe = useCallback(async () => {
    setRefreshing(true);
    const native = await isNativePushAvailable();
    setIsNativeApp(native);
    setClientMode(await getStaffPushClientMode());
    if (native) {
      setNativeRuntime(await getNativePushRuntimeDiagnostics());
    } else {
      setNativeRuntime(null);
    }
    setVapid(getVapidKeyDiagnostics());
    setBrowser(getBrowserPushSupport());
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    const swDiag = native ? null : await probePushServiceWorker("test");
    setSw(swDiag);
    const serverDiag = await fetchServerVapidDiagnostics();
    setServerVapid(serverDiag);
    const device = await getLocalDevicePushStatus();
    setDeviceStatus(device);
    setLocalDeviceReady(device.ready);
    if (storeId) {
      setStoreStaffDevices(await fetchStoreStaffPushDeviceCounts(storeId));
    } else {
      setStoreStaffDevices(null);
    }
    setRefreshing(false);
  }, [storeId]);

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
      if (isNativeApp && audience === "marketing") {
        toast.error("No telemóvel da equipa só pode registar alertas de equipa. Cliente usa o menu no browser.");
        return;
      }
      const result =
        audience === "marketing"
          ? await subscribeCustomerMarketingPush(storeId)
          : await subscribeStaffPush(storeId);
      if (result.ok) {
        toast.success(isNativeApp ? "Este telemóvel está registado para alertas" : "Este dispositivo está subscrito para push");
        await refreshProbe();
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

  const handleNativeSelfTest = async () => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    setSendBusy(true);
    setTestStatus("sending");
    setTestResult(null);
    try {
      const result = await sendNativeDeviceTestPush({ storeId, title: testTitle, body: testBody });
      setTestResult(result);
      setTestStatus(result.ok ? "success" : "error");
      if (result.ok) {
        toast.success(result.userMessage ?? "Notificação enviada para este telemóvel");
      } else {
        if (/BadDeviceToken|DeviceTokenNotForTopic|token deste iPhone/i.test(result.userMessage ?? "")) {
          const { registerNativeStaffPush } = await import("@/services/nativePush");
          await registerNativeStaffPush(storeId);
        }
        toast.error(result.userMessage ?? result.error ?? "Falha ao enviar teste");
      }
      void refreshProbe();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTestStatus("error");
      setTestResult({ ok: false, error: message, userMessage: message });
    } finally {
      setSendBusy(false);
    }
  };

  const handleBroadcastTest = async () => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    setBroadcastBusy(true);
    setTestStatus("sending");
    setTestResult(null);
    try {
      const result = await sendBroadcastTestPushNotification({
        storeId,
        audience,
        title: testTitle,
        body: testBody,
        alsoNotifyStaff: audience === "marketing" ? alsoNotifyStaff : false,
      });
      setTestResult(result);
      setTestStatus(result.ok ? "success" : "error");
      if (result.ok) {
        toast.success(
          result.partial
            ? (result.userMessage ?? `Enviado com avisos — ${result.sent ?? 0} dispositivo(s)`)
            : result.userMessage ?? `Broadcast enviado — ${result.sent ?? 0} dispositivo(s)`,
        );
      } else toast.error(result.userMessage ?? result.error ?? "Falha no broadcast");
      void refreshProbe();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTestStatus("error");
      setTestResult({ ok: false, error: message, userMessage: message });
    } finally {
      setBroadcastBusy(false);
    }
  };

  const clientVapidOk = vapid.loaded && vapid.validFormat && vapid.decodable;
  const serverVapidOk = Boolean(serverVapid?.configured);
  const serverFcmOk = Boolean(serverVapid?.fcmConfigured);
  const serverApnsOk = Boolean(serverVapid?.apnsConfigured);
  const canSendLocalTest = !isNativeApp && serverVapidOk && permission === "granted" && Boolean(storeId);
  const canSendBroadcast = Boolean(storeId) && (serverVapidOk || serverFcmOk || serverApnsOk);
  const canSendNativeSelfTest =
    isNativeApp && Boolean(storeId) && localDeviceReady && (serverApnsOk || serverFcmOk);
  const testStatusLabel =
    testStatus === "sending"
      ? "A enviar agora…"
      : testStatus === "success"
        ? testResult?.partial
          ? "Enviado — ver aviso"
          : "Sucesso — notificação enviada"
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
      {serverVapid && !serverApnsOk && isNativeApp ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Falta a chave Apple no servidor</p>
            <p className="text-xs mt-1 opacity-90">
              Adicione APNS_KEY_ID, APNS_TEAM_ID e APNS_PRIVATE_KEY nos segredos da Lovable Cloud (a mesma chave .p8
              do Apple Developer).
            </p>
          </div>
        </div>
      ) : null}
      {serverVapid && serverApnsOk && isNativeApp && serverVapid.apnsSandbox === true ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Servidor em modo teste (.ipa Development)</p>
            <p className="text-xs mt-1 opacity-90">
              Correcto só para app instalada pelo ficheiro de teste. Se usa a <strong>App Store</strong>, defina
              APNS_USE_SANDBOX=false na Lovable e Publish.
            </p>
          </div>
        </div>
      ) : null}
      {serverVapid && serverApnsOk && isNativeApp && serverVapid.apnsSandbox === false ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm flex gap-2">
          <Bell className="h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-semibold">Servidor em modo App Store</p>
            <p className="text-xs mt-1 opacity-90">
              Alinhado com a app descarregada da loja Apple. Registe push neste telemóvel e teste com a app fechada.
            </p>
          </div>
        </div>
      ) : null}
      {!isNativeApp ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Está no browser — não no app instalado</p>
            <p className="text-xs mt-1 opacity-90">
              Para registar o iPhone da equipa, abra a <strong>app Kebab Turco</strong> instalada (App Store ou .ipa).
              O browser do computador só regista este Chrome, não o telemóvel.
              {clientMode === "needs-native-app"
                ? " Detetámos telemóvel no browser — use a app instalada."
                : ""}
            </p>
          </div>
        </div>
      ) : null}
      {serverVapid && serverApnsOk && isNativeApp && serverVapid.staffSecretConfigured === false ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Alertas automáticos de pedidos podem não chegar</p>
            <p className="text-xs mt-1 opacity-90">
              O segredo de envio da equipa no Supabase ainda não está configurado. Peça ao suporte para alinhar com a
              Lovable Cloud (STAFF_PUSH_INTERNAL_SECRET).
            </p>
          </div>
        </div>
      ) : null}
      {!isNativeApp && serverVapid?.configured && serverVapid.keysMatchClient === false ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="font-semibold">Chaves do site e do servidor não coincidem</p>
        </div>
      ) : null}
    </>
  );

  const statusCards = isNativeApp ? (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Este telemóvel</CardTitle>
          <CardDescription>App nativa iPhone / Android</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <AdminDiagnosticStatusBadge ok={Boolean(localDeviceReady)} label={deviceStatus?.label ?? "A verificar…"} />
          {deviceStatus?.tokenPreview ? (
            <p className="text-xs text-muted-foreground font-mono truncate">Token {deviceStatus.tokenPreview}</p>
          ) : null}
          {nativeRuntime ? (
            <ul className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
              <li>Ambiente: {nativeRuntime.environment === "native" ? "app instalada" : "browser"}</li>
              <li>Plataforma: {nativeRuntime.platform}</li>
              <li>Permissão: {nativeRuntime.permission}</li>
              <li>Ligação push: {nativeRuntime.bridgeReady ? "activa" : "a iniciar…"}</li>
              <li>Token local: {nativeRuntime.hasCachedToken ? "sim" : "não"}</li>
              {nativeRuntime.lastRegistrationError ? (
                <li className="text-destructive">Erro Apple: {nativeRuntime.lastRegistrationError}</li>
              ) : null}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      <Card className={!serverApnsOk ? "border-amber-500/40" : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Servidor (APNs iPhone)</CardTitle>
          <CardDescription>Necessário para chegar ao iPhone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {serverVapid === null ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <AdminDiagnosticStatusBadge ok={serverApnsOk} label={serverApnsOk ? "Pronto" : "Falta chave Apple"} />
              {serverApnsOk ? (
                <p className="text-xs text-muted-foreground">
                  Modo Apple: {serverVapid.apnsSandbox === false ? "App Store" : "Teste (.ipa)"}
                  {serverVapid.apnsTopic ? ` · ${serverVapid.apnsTopic}` : ""}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  ) : (
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
          <AdminDiagnosticStatusBadge ok={permission === "granted"} label={String(permission)} />
          <p>PushManager: {browser.pushManagerSupported ? "Sim" : "Não"}</p>
        </CardContent>
      </Card>
    </div>
  );

  const testSection = (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 text-sm space-y-2">
          {!isNativeApp ? (
            <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs space-y-1">
              <p className="font-semibold text-amber-900">Está no computador — isto não regista o iPhone</p>
              <p>
                «Registar push» aqui só pede permissão ao browser do PC. Para o telemóvel: abra a <strong>app Kebab Turco</strong> no
                iPhone → <strong>Painel → Definições</strong> → ligue <strong>Notificações push</strong> e aceite quando o iPhone
                pedir.
              </p>
              {storeStaffDevices ? (
                <p>
                  Nesta loja: {storeStaffDevices.ios} iPhone(s) · {storeStaffDevices.android} Android ·{" "}
                  {storeStaffDevices.web} browser(s) registados para a equipa.
                </p>
              ) : null}
            </div>
          ) : null}
          <p>
            Estado {isNativeApp ? "deste telemóvel" : "deste browser"}:{" "}
            {localDeviceReady ? (
              <span className="text-emerald-600 font-semibold">{deviceStatus?.label ?? "registado"}</span>
            ) : (
              <span className="text-amber-600 font-semibold">{deviceStatus?.label ?? "não registado"}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Equipa → {STAFF_PUSH_TAG} · Cliente → {CUSTOMER_MARKETING_PUSH_TAG}
          </p>
          {isNativeApp ? (
            <p className="text-xs text-muted-foreground">
              1) Instale a versão nova da app no iPhone (build Codemagic) · 2) «Registar push» · 3) «Enviar teste para
              este telemóvel»
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No computador, «Enviar para todos» só chega a telemóveis já registados na app. Registe primeiro no iPhone (passos
              acima).
            </p>
          )}
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
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as PushTestAudience)}
                disabled={isNativeApp}
              >
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
                {isNativeApp ? "Registar push" : "Registar neste browser (não é o iPhone)"}
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
          {audience === "marketing" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoNotifyStaff}
                onChange={(e) => setAlsoNotifyStaff(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Também enviar para dispositivos da equipa (teste completo)
            </label>
          ) : null}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Resultado em tempo real</span>
              <AdminDiagnosticStatusBadge ok={testStatus === "success"} label={testStatusLabel} />
            </div>
            {testResult ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Enviados: {testResult.sent ?? 0} · Alvos: {testResult.targeted ?? 0} · Encontrados:{" "}
                  {testResult.matched ?? 0}
                  {typeof testResult.sentApns === "number" ||
                  typeof testResult.sentWeb === "number" ||
                  typeof testResult.sentFcm === "number" ? (
                    <>
                      {" "}
                      · iPhone: {testResult.sentApns ?? 0} · Android: {testResult.sentFcm ?? 0} · Browser:{" "}
                      {testResult.sentWeb ?? 0}
                    </>
                  ) : null}
                </p>
                {testResult.userMessage || testResult.error ? (
                  <p
                    className={
                      testResult.partial ? "text-amber-800 font-medium" : "text-destructive font-medium"
                    }
                  >
                    {testResult.userMessage ?? testResult.error}
                  </p>
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
          <div className="grid gap-2 sm:grid-cols-2">
            {!isNativeApp ? (
              <Button disabled={sendBusy || broadcastBusy || !canSendLocalTest} onClick={() => void handleSendTest()}>
                {sendBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Testar neste browser
              </Button>
            ) : (
              <Button
                disabled={sendBusy || broadcastBusy || !canSendNativeSelfTest || !localDeviceReady}
                onClick={() => void handleNativeSelfTest()}
              >
                {sendBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar teste para este telemóvel
              </Button>
            )}
            <Button
              variant={isNativeApp ? "outline" : "secondary"}
              disabled={sendBusy || broadcastBusy || !canSendBroadcast}
              onClick={() => void handleBroadcastTest()}
            >
              {broadcastBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              {isNativeApp ? "Enviar para toda a equipa" : "Enviar para todos os dispositivos"}
            </Button>
          </div>
          {!isNativeApp && permission !== "granted" ? (
            <p className="text-xs text-amber-700">
              Permissão negada neste browser — normal no computador. Isso não regista o iPhone. Use a app no telemóvel
              (Painel → Definições → Notificações push).
            </p>
          ) : null}
          {!isNativeApp && storeStaffDevices && storeStaffDevices.ios === 0 ? (
            <p className="text-xs text-destructive font-medium">
              Nenhum iPhone da equipa registado nesta loja — «Enviar para todos» não pode chegar ao seu telemóvel até
              ligar notificações na app.
            </p>
          ) : null}
          {isNativeApp && !localDeviceReady ? (
            <p className="text-xs text-amber-700">
              Se «Registar push» falha, precisa da versão nova da app no iPhone (correcção nativa). Depois feche a app
              por completo e abra outra vez.
            </p>
          ) : null}
          {isNativeApp && testStatus === "error" && testResult?.userMessage?.includes("token") ? (
            <p className="text-xs text-destructive font-medium">
              Toque «Registar push» outra vez (renova o token) e repita o teste com a app em segundo plano ou ecrã
              bloqueado.
            </p>
          ) : null}
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
