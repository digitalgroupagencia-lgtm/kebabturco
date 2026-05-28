import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { subscribeStaffPush } from "@/lib/staffPush";
import { subscribeCustomerMarketingPush } from "@/lib/customerMarketingPush";
import { getVapidKeyDiagnostics } from "@/lib/push/pushVapidDiagnostics";
import {
  getBrowserPushSupport,
  probePushServiceWorker,
  type ServiceWorkerDiagnostics,
} from "@/lib/push/pushServiceWorkerProbe";
import {
  clearPushLogs,
  getPushLogs,
  subscribePushLogs,
  type PushLogEntry,
} from "@/lib/push/pushLogger";
import { sendTestPushNotification, fetchServerVapidDiagnostics, type PushTestAudience, type ServerVapidDiagnostics } from "@/lib/push/pushTestService";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { STAFF_PUSH_TAG } from "@/lib/staffPush";
import { cn } from "@/lib/utils";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        ok
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/50 bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

function LogLevelBadge({ level }: { level: PushLogEntry["level"] }) {
  const cls =
    level === "error"
      ? "bg-destructive/15 text-destructive"
      : level === "warn"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", cls)}>
      {level}
    </span>
  );
}

export default function PushTestPage() {
  const { storeId } = useAdminStoreId();
  const [refreshing, setRefreshing] = useState(false);
  const [vapid, setVapid] = useState(() => getVapidKeyDiagnostics());
  const [browser, setBrowser] = useState(() => getBrowserPushSupport());
  const [sw, setSw] = useState<ServiceWorkerDiagnostics | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [logs, setLogs] = useState<PushLogEntry[]>(() => getPushLogs());
  const [serverVapid, setServerVapid] = useState<ServerVapidDiagnostics | null>(null);
  const [localDeviceReady, setLocalDeviceReady] = useState<boolean | null>(null);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [audience, setAudience] = useState<PushTestAudience>("staff");
  const [testTitle, setTestTitle] = useState("Teste push Kebab Turco");
  const [testBody, setTestBody] = useState("Se vês isto, as notificações push estão a funcionar.");

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
    return subscribePushLogs(() => setLogs(getPushLogs()));
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
    try {
      const result = await sendTestPushNotification({
        storeId,
        audience,
        title: testTitle,
        body: testBody,
      });
      if (result.ok) {
        toast.success(`Notificação enviada — ${result.sent ?? 0} dispositivo(s)`);
      } else if (result.skipped) {
        toast.error(result.userMessage ?? "Servidor sem chaves para enviar notificações");
      } else {
        toast.error(result.userMessage ?? result.error ?? "Falha ao enviar teste");
      }
    } finally {
      setSendBusy(false);
    }
  };

  const copyLogs = async () => {
    const text = logs
      .map(
        (l) =>
          `[${l.at}] ${l.level.toUpperCase()} ${l.context}/${l.stage}: ${l.message}${
            l.details ? ` ${JSON.stringify(l.details)}` : ""
          }`,
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Logs copiados");
  };

  const clientVapidOk = vapid.loaded && vapid.validFormat && vapid.decodable;
  const serverVapidOk = Boolean(serverVapid?.configured);
  const permOk = permission === "granted";
  const canSendTest = serverVapidOk && permOk && Boolean(storeId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Diagnóstico e teste push
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verifica chaves no site e no servidor, service worker, e envia uma notificação de teste.
        </p>
      </div>

      {serverVapid && !serverVapid.configured ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50 flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">O site pode subscrever, mas o servidor ainda não envia</p>
            <p className="text-xs mt-1 opacity-90">
              A chave verde «No site» só permite registar o telemóvel. Para enviar notificações,
              configure <strong>VAPID_PUBLIC_KEY</strong> e <strong>VAPID_PRIVATE_KEY</strong> nos
              segredos da Lovable Cloud e volte a publicar as funções do servidor.
            </p>
          </div>
        </div>
      ) : null}

      {serverVapid?.configured && serverVapid.keysMatchClient === false ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Chaves do site e do servidor não coincidem</p>
            <p className="text-xs mt-1 opacity-90">
              A chave pública no site (fallback ou variável) é diferente da chave no servidor.
              O envio pode falhar até alinhar ambas.
            </p>
          </div>
        </div>
      ) : null}

      <AdminStoreSwitcher hint="Escolha a unidade para subscrição e envio de teste." />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void refreshProbe()} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar estado
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chave no site</CardTitle>
            <CardDescription>Pública — subscrição neste browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatusBadge ok={clientVapidOk} label={clientVapidOk ? "OK para subscrever" : "Problema"} />
            <dl className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Origem</dt>
                <dd className="font-mono text-foreground">
                  {vapid.source === "env" ? "variável do site" : vapid.source === "fallback" ? "fallback" : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Pré-visualização</dt>
                <dd className="font-mono text-foreground truncate max-w-[140px]" title={vapid.keyPreview}>
                  {vapid.keyPreview}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Formato</dt>
                <dd>{vapid.validFormat ? "OK" : "Inválido"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Decodificável</dt>
                <dd>{vapid.decodable ? "Sim" : "Não"}</dd>
              </div>
            </dl>
            {vapid.decodeError ? (
              <p className="text-xs text-destructive">{vapid.decodeError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={!serverVapidOk ? "border-amber-500/40" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chave no servidor</CardTitle>
            <CardDescription>Envio de notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {serverVapid === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <StatusBadge
                  ok={serverVapidOk}
                  label={serverVapidOk ? "Pronto a enviar" : "Não configurado"}
                />
                <dl className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Chave pública</dt>
                    <dd>{serverVapid.hasPublicKey ? "Sim" : "Não"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Chave privada</dt>
                    <dd>{serverVapid.hasPrivateKey ? "Sim" : "Não"}</dd>
                  </div>
                  {serverVapid.publicKeyPreview ? (
                    <div className="flex justify-between gap-2">
                      <dt>Pré-visualização</dt>
                      <dd
                        className="font-mono text-foreground truncate max-w-[120px]"
                        title={serverVapid.publicKeyPreview}
                      >
                        {serverVapid.publicKeyPreview}
                      </dd>
                    </div>
                  ) : null}
                  {serverVapid.keysMatchClient != null ? (
                    <div className="flex justify-between gap-2">
                      <dt>Igual ao site</dt>
                      <dd>{serverVapid.keysMatchClient ? "Sim" : "Não"}</dd>
                    </div>
                  ) : null}
                </dl>
                {serverVapid.probeError ? (
                  <p className="text-xs text-destructive">{serverVapid.probeError}</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service worker</CardTitle>
            <CardDescription>/push-handler.js</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatusBadge
              ok={Boolean(sw?.pushHandlerRegistered)}
              label={sw?.pushHandlerRegistered ? "Registado" : "Não registado"}
            />
            {sw ? (
              <dl className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Estado</dt>
                  <dd className="font-mono text-foreground">{sw.pushHandlerState}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>HTTPS</dt>
                  <dd>{sw.secureContext ? "Sim" : "Não"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Registos totais</dt>
                  <dd>{sw.totalRegistrations}</dd>
                </div>
              </dl>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {sw?.registrationError ? (
              <p className="text-xs text-destructive">{sw.registrationError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Permissões</CardTitle>
            <CardDescription>Browser neste dispositivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatusBadge ok={permOk} label={permission === "granted" ? "Concedida" : permission} />
            <dl className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>PushManager</dt>
                <dd>{browser.pushManagerSupported ? "Sim" : "Não"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Notificações</dt>
                <dd>{browser.notificationSupported ? "Sim" : "Não"}</dd>
              </div>
            </dl>
            {!browser.secureContext ? (
              <p className="text-xs text-amber-600 flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Push requer HTTPS (excepto localhost).
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como funciona «dispositivo»?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">Um telemóvel ou computador = um dispositivo.</strong>{" "}
            Tem de carregar em <strong>Registar push neste dispositivo</strong> antes de enviar o teste.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Escolha a <strong>mesma loja</strong> (Gandia ou Playa) ao registar e ao enviar.</li>
            <li>
              Escolha o <strong>mesmo tipo</strong>: Equipa ou Cliente — registar os dois no mesmo aparelho
              substitui o anterior (só conta o último).
            </li>
            <li>
              Equipa → etiqueta interna <code className="text-foreground">{STAFF_PUSH_TAG}</code> · Cliente →{" "}
              <code className="text-foreground">{CUSTOMER_MARKETING_PUSH_TAG}</code>
            </li>
          </ul>
          <p className="text-xs pt-1">
            Estado deste browser:{" "}
            {localDeviceReady === null ? (
              "…"
            ) : localDeviceReady ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">registado e pronto</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">ainda não registado</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testar neste dispositivo</CardTitle>
          <CardDescription>
            1) Subscreva este telemóvel/computador · 2) Envie uma notificação de teste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de subscrição</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as PushTestAudience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Equipa (painel)</SelectItem>
                  <SelectItem value="marketing">Cliente (promoções)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={subscribeBusy || !storeId}
                onClick={() => void handleSubscribe()}
              >
                {subscribeBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                Registar push neste dispositivo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="push-test-title">Título da notificação</Label>
            <Input id="push-test-title" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-test-body">Mensagem</Label>
            <Input id="push-test-body" value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </div>

          <Button
            type="button"
            variant="default"
            disabled={sendBusy || !canSendTest}
            onClick={() => void handleSendTest()}
          >
            {sendBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar notificação de teste
          </Button>
          {!permOk ? (
            <p className="text-xs text-muted-foreground">
              Registe o dispositivo primeiro para conceder permissão de notificações.
            </p>
          ) : !serverVapidOk ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Configure as chaves VAPID no servidor antes de enviar testes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Logs de push</CardTitle>
            <CardDescription>Erros de permissão, VAPID e service worker (também na consola)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyLogs()} disabled={!logs.length}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearPushLogs();
                setLogs([]);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem logs ainda — registe ou envie um teste.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs font-mono"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <LogLevelBadge level={log.level} />
                    <span className="text-muted-foreground">{log.context}/{log.stage}</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(log.at).toLocaleTimeString("pt-PT")}
                    </span>
                  </div>
                  <p className="text-foreground break-words">{log.message}</p>
                  {log.details ? (
                    <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
