import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { pushLog } from "@/lib/push/pushLogger";
import { readCachedNativePushToken } from "@/services/nativePush";
import { getLocalDevicePushStatus } from "@/lib/push/getLocalDevicePushStatus";
import { resolveMarketingBroadcastCopy } from "@/lib/marketing/resolveMarketingBroadcast";

export type PushTestAudience = "staff" | "marketing";

export type PushTestSendResult = {
  ok: boolean;
  sent?: number;
  sentApns?: number;
  sentFcm?: number;
  sentWeb?: number;
  failed?: number;
  partial?: boolean;
  matched?: number;
  targeted?: number;
  errors?: { endpoint: string; status?: number; message: string; channel?: string }[];
  skipped?: boolean;
  reason?: string;
  error?: string;
  userMessage?: string;
};

export type ServerPushDiagnostics = {
  configured: boolean;
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  publicKey?: string | null;
  publicKeyPreview: string | null;
  keysMatchClient: boolean | null;
  fcmConfigured?: boolean;
  apnsConfigured?: boolean;
  apnsSandbox?: boolean | null;
  apnsTopic?: string | null;
  probeError?: string;
  staffSecretConfigured?: boolean | null;
  iosStaffDevices?: number | null;
};

/** @deprecated use ServerPushDiagnostics */
export type ServerVapidDiagnostics = ServerPushDiagnostics;

const SERVER_VAPID_REASON_PT: Record<string, string> = {
  "VAPID not configured":
    "O servidor não tem as chaves VAPID (pública + privada). Configure nos segredos da Lovable Cloud.",
};

function formatInvokeError(error: { message?: string; context?: unknown }): string {
  const ctx = error.context as { body?: string; status?: number } | undefined;
  if (ctx?.body) {
    try {
      const parsed = JSON.parse(ctx.body) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      if (ctx.body.length < 280) return ctx.body;
    }
  }
  if (error.message?.includes("non-2xx")) {
    return "O servidor recusou o envio (sessão expirada ou sem permissão). Saia e entre outra vez no painel.";
  }
  return error.message ?? "Erro ao contactar o servidor de push";
}

async function invokePushFunction(body: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  return supabase.functions.invoke("send-push-notification", { body, headers });
}

function parseSendPayload(data: unknown): {
  sent?: number;
  sentApns?: number;
  sentFcm?: number;
  sentWeb?: number;
  failed?: number;
  partial?: boolean;
  matched?: number;
  targeted?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
  apnsDeliveryNote?: string;
  errors?: { endpoint: string; status?: number; message: string; channel?: string }[];
} {
  return (data ?? {}) as {
    sent?: number;
    sentApns?: number;
    sentFcm?: number;
    sentWeb?: number;
    failed?: number;
    partial?: boolean;
    matched?: number;
    targeted?: number;
    skipped?: boolean;
    reason?: string;
    error?: string;
    apnsDeliveryNote?: string;
    errors?: { endpoint: string; status?: number; message: string; channel?: string }[];
  };
}

function apnsErrorUserMessage(message: string): string {
  if (/BadEnvironmentKeyInToken/i.test(message)) {
    return "A Apple recusou o iPhone porque o token não combina com o modo teste/loja. Desinstale a app, reinstale o ficheiro .ipa de teste, ligue notificações em Definições → Kebab Turco, e registe outra vez na app (Painel → Definições).";
  }
  if (/DeviceTokenNotForTopic/i.test(message)) {
    return "O identificador da app no servidor não coincide com o iPhone. Confirme que a chave Apple é para net.kebabturco.app.";
  }
  if (/BadDeviceToken/i.test(message)) {
    if (/sandbox/.test(message) && /api\.push\.apple/.test(message)) {
      return "A Apple recusou o token nos dois modos (teste e loja). Desinstale a app Kebab Turco do iPhone, instale de novo pelo ficheiro .ipa, abra, toque «Registar push», feche a app e teste com o ecrã bloqueado.";
    }
    if (/api\.push\.apple\.com/.test(message) && !/sandbox/.test(message)) {
      return "O servidor está em modo teste mas o iPhone parece ser de loja. Na Lovable mude APNS_USE_SANDBOX para false, Publish, e teste outra vez. Ou reinstale a app pelo ficheiro .ipa de teste.";
    }
    if (/sandbox/.test(message)) {
      return "Token recusado no modo teste. Desinstale a app, reinstale o .ipa, «Registar push» outra vez e teste com ecrã bloqueado.";
    }
    return "A Apple recusou o token deste iPhone. Desinstale a app, reinstale, «Registar push» outra vez e teste com ecrã bloqueado.";
  }
  return `Erro da Apple: ${message.slice(0, 280)}`;
}

function finalizeNativeDirectResult(
  payload: ReturnType<typeof parseSendPayload>,
  platform: "ios" | "android",
): PushTestSendResult {
  if (payload.error) {
    return { ok: false, error: payload.error, userMessage: payload.error };
  }
  if (payload.skipped) {
    const userMessage = translateServerVapidReason(payload.reason);
    return { ok: false, skipped: true, reason: payload.reason, userMessage };
  }

  const errors = payload.errors ?? [];
  const channelErrors = errors.filter((e) => e.channel === platform);
  if (channelErrors.length > 0) {
    const first = channelErrors[0];
    return {
      ok: false,
      sent: payload.sent ?? 0,
      matched: payload.matched,
      targeted: payload.targeted,
      errors,
      userMessage: apnsErrorUserMessage(first.message),
    };
  }

  const channelSent = platform === "ios" ? (payload.sentApns ?? 0) : (payload.sentFcm ?? 0);
  if (channelSent === 0) {
    return {
      ok: false,
      sent: 0,
      matched: payload.matched,
      targeted: payload.targeted,
      errors,
      userMessage:
        platform === "ios"
          ? "O servidor não entregou ao iPhone. Registe push outra vez e confirme APNS_USE_SANDBOX=true para a app de teste."
          : "O servidor não entregou a este telemóvel Android.",
    };
  }

  return { ok: true, sent: channelSent, matched: payload.matched, targeted: payload.targeted, userMessage: payload.apnsDeliveryNote };
}

function finalizeWebDirectResult(payload: ReturnType<typeof parseSendPayload>): PushTestSendResult {
  if (payload.error) {
    return { ok: false, error: payload.error, userMessage: payload.error };
  }
  if (payload.skipped) {
    const userMessage = translateServerVapidReason(payload.reason);
    return { ok: false, skipped: true, reason: payload.reason, userMessage };
  }

  const errors = payload.errors ?? [];
  const webErrors = errors.filter((e) => e.channel === "web");
  if (webErrors.length > 0) {
    return {
      ok: false,
      sent: 0,
      targeted: payload.targeted,
      errors,
      userMessage: `Este browser não recebeu: ${webErrors[0].message.slice(0, 200)}`,
    };
  }

  const sentWeb = payload.sentWeb ?? 0;
  if (sentWeb === 0) {
    return {
      ok: false,
      sent: 0,
      targeted: payload.targeted,
      errors,
      userMessage: "O servidor não entregou a este browser. Registe push outra vez.",
    };
  }

  return { ok: true, sent: sentWeb, targeted: payload.targeted, sentWeb };
}

function withChannelCounts(
  base: PushTestSendResult,
  payload: ReturnType<typeof parseSendPayload>,
): PushTestSendResult {
  return {
    ...base,
    sentApns: payload.sentApns ?? 0,
    sentFcm: payload.sentFcm ?? 0,
    sentWeb: payload.sentWeb ?? 0,
    failed: payload.failed ?? payload.errors?.length ?? 0,
  };
}

function broadcastDeliveryMessage(payload: ReturnType<typeof parseSendPayload>): string | undefined {
  const sentApns = payload.sentApns ?? 0;
  const sentWeb = payload.sentWeb ?? 0;
  const sentFcm = payload.sentFcm ?? 0;

  if (sentApns === 0 && sentFcm === 0 && sentWeb > 0) {
    return `A mensagem foi para ${sentWeb} computador/browser, nenhum telemóvel recebeu. No iPhone: abra a app Kebab Turco → Painel → Definições → ligue «Notificações push» e aceite quando o iPhone pedir.`;
  }
  if (sentApns > 0 && sentWeb === 0 && sentFcm === 0) {
    return `Enviado para ${sentApns} iPhone(s). Feche a app ou bloqueie o ecrã para ver o aviso.`;
  }
  if (sentApns > 0 && sentWeb > 0) {
    return `Enviado para ${sentApns} iPhone(s) e ${sentWeb} browser(s). No telemóvel, veja com a app em segundo plano.`;
  }
  if (sentFcm > 0) {
    return `Enviado para ${sentFcm} Android e ${sentApns} iPhone(s).`;
  }
  return undefined;
}

function finalizeBroadcastResult(
  payload: ReturnType<typeof parseSendPayload>,
  emptyMessage: string,
): PushTestSendResult {
  const base = finalizeSendResult(payload, emptyMessage);
  if (!base.ok) return withChannelCounts(base, payload);

  const enriched = withChannelCounts(base, payload);
  const channelMessage = broadcastDeliveryMessage(payload);
  const failed = payload.failed ?? payload.errors?.length ?? 0;

  if (failed > 0 || payload.partial) {
    const iosFailed = payload.errors?.filter((e) => e.channel === "ios").length ?? 0;
    const iosErr = payload.errors?.find((e) => e.channel === "ios");
    const iosHint =
      iosErr && /BadEnvironmentKeyInToken|BadDeviceToken/i.test(iosErr.message)
        ? apnsErrorUserMessage(iosErr.message)
        : null;
    return {
      ...enriched,
      ok: true,
      partial: true,
      userMessage:
        iosFailed > 0
          ? iosHint ??
            `Enviado para ${base.sent} dispositivo(s), mas ${iosFailed} iPhone(s) falharam, no telemóvel: Definições → Kebab Turco → Notificações (ligar) e registe outra vez na app.`
          : channelMessage ?? `Enviado para ${base.sent} dispositivo(s), ${failed} falharam.`,
    };
  }

  if (channelMessage) {
    return { ...enriched, partial: (payload.sentWeb ?? 0) > 0 && (payload.sentApns ?? 0) === 0, userMessage: channelMessage };
  }

  return enriched;
}

function finalizeSendResult(
  payload: ReturnType<typeof parseSendPayload>,
  emptyMessage: string,
): PushTestSendResult {
  if (payload.error) {
    return { ok: false, error: payload.error, userMessage: payload.error };
  }

  if (payload.skipped) {
    const userMessage = translateServerVapidReason(payload.reason);
    return { ok: false, skipped: true, reason: payload.reason, userMessage };
  }

  const sent = payload.sent ?? 0;
  const matched = payload.matched ?? 0;
  const errors = payload.errors;

  if (sent === 0) {
    const firstErr = errors?.[0];
    const userMessage = firstErr
      ? `Erro da Apple/Google${firstErr.status ? ` (${firstErr.status})` : ""}: ${firstErr.message.slice(0, 280)}`
      : emptyMessage;
    return { ok: false, sent: 0, matched, targeted: payload.targeted, errors, userMessage };
  }

  return {
    ok: true,
    sent,
    matched,
    targeted: payload.targeted,
    errors,
    sentApns: payload.sentApns,
    sentFcm: payload.sentFcm,
    sentWeb: payload.sentWeb,
  };
}

export async function fetchStoreStaffPushDeviceCounts(storeId: string): Promise<{
  ios: number;
  android: number;
  web: number;
}> {
  const fallback = { ios: 0, android: 0, web: 0 };
  try {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("platform")
      .eq("store_id", storeId)
      .eq("customer_phone", "__staff__");
    if (error || !data) return fallback;
    return data.reduce(
      (acc, row) => {
        const p = (row.platform ?? "web").toLowerCase();
        if (p === "ios") acc.ios += 1;
        else if (p === "android") acc.android += 1;
        else acc.web += 1;
        return acc;
      },
      { ...fallback },
    );
  } catch {
    return fallback;
  }
}

export function translateServerVapidReason(reason?: string): string {
  if (!reason) return "Chaves de envio não configuradas no servidor";
  return SERVER_VAPID_REASON_PT[reason] ?? reason;
}

export async function fetchServerVapidDiagnostics(): Promise<ServerPushDiagnostics> {
  const fallback: ServerPushDiagnostics = {
    configured: false,
    hasPublicKey: false,
    hasPrivateKey: false,
    publicKeyPreview: null,
    keysMatchClient: null,
  };

  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: { probe: true },
    });

    if (error) {
      pushLog("test", "vapid_check", "error", "Não foi possível verificar VAPID no servidor", {
        message: error.message,
      });
      return { ...fallback, probeError: error.message };
    }

    const payload = data as {
      configured?: boolean;
      hasPublicKey?: boolean;
      hasPrivateKey?: boolean;
      publicKey?: string | null;
      publicKeyPreview?: string | null;
      fcmConfigured?: boolean;
      apnsConfigured?: boolean;
      apnsSandbox?: boolean | null;
      apnsTopic?: string | null;
    };

    const clientKey = getVapidPublicKey();
    let keysMatchClient: boolean | null = null;
    if (payload.configured && clientKey && payload.publicKey) {
      keysMatchClient = clientKey === payload.publicKey;
    } else if (payload.configured && clientKey && payload.publicKeyPreview) {
      const clientPreview =
        clientKey.length <= 16 ? clientKey : `${clientKey.slice(0, 12)}…${clientKey.slice(-6)}`;
      keysMatchClient = clientPreview === payload.publicKeyPreview;
    }

    const result: ServerPushDiagnostics = {
      configured: Boolean(payload.configured),
      hasPublicKey: Boolean(payload.hasPublicKey),
      hasPrivateKey: Boolean(payload.hasPrivateKey),
      publicKey: payload.publicKey ?? null,
      publicKeyPreview: payload.publicKeyPreview ?? null,
      keysMatchClient,
      fcmConfigured: Boolean(payload.fcmConfigured),
      apnsConfigured: Boolean(payload.apnsConfigured),
      apnsSandbox: payload.apnsSandbox ?? null,
      apnsTopic: payload.apnsTopic ?? null,
    };

    try {
      const { data: dispatchStatus } = await supabase.rpc("get_push_dispatch_status");
      const status = dispatchStatus as {
        staffSecretConfigured?: boolean;
        iosSubscriptions?: number;
      } | null;
      if (status) {
        result.staffSecretConfigured = Boolean(status.staffSecretConfigured);
        result.iosStaffDevices = status.iosSubscriptions ?? null;
      }
    } catch {
      /* RPC may not exist until migration runs */
    }

    pushLog(
      "test",
      "vapid_check",
      result.configured ? "info" : "warn",
      result.configured
        ? "Servidor com chaves VAPID para envio"
        : "Servidor sem chaves VAPID, só a subscrição no site funciona",
      result,
    );

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "vapid_check", "error", message);
    return { ...fallback, probeError: message };
  }
}

async function invokeStoreBroadcast(opts: {
  storeId: string;
  audience?: "marketing";
  title: string;
  body: string;
  url: string;
}): Promise<PushTestSendResult> {
  const { storeId, audience, title, body: msgBody, url } = opts;

  const { data, error } = await invokePushFunction({
    storeId,
    title,
    body: msgBody,
    tag: `staff-new-order-test-${Date.now()}`,
    url,
    requireInteraction: true,
    pushDiagnostic: true,
  });

  if (error) {
    const userMessage = formatInvokeError(error);
    pushLog("test", "broadcast_send", "error", "Função de envio push falhou no servidor", {
      message: error.message,
      userMessage,
      audience: audience ?? "staff",
    });
    return { ok: false, error: error.message, userMessage };
  }

  const payload = parseSendPayload(data);

  if (payload.error) {
    return { ok: false, error: payload.error, userMessage: payload.error };
  }

  if (payload.skipped) {
    const userMessage = translateServerVapidReason(payload.reason);
    return { ok: false, skipped: true, reason: payload.reason, userMessage };
  }

  const sent = payload.sent ?? 0;
  const matched = payload.matched ?? 0;
  const errors = payload.errors;

  if (sent === 0) {
    const firstErr = errors?.[0];
    const userMessage = firstErr
      ? `Erro da Apple/Google${firstErr.status ? ` (${firstErr.status})` : ""}: ${firstErr.message.slice(0, 240)}`
      : audience === "marketing"
        ? "Nenhum cliente com notificações activas nesta loja. Peça para aceitar no menu ou registe um telemóvel de teste."
        : "Nenhum dispositivo da equipa registado nesta loja. Abra a app no iPhone, entre na equipa e aceite notificações.";
    return { ok: false, sent: 0, matched, targeted: payload.targeted, errors, userMessage };
  }

  return finalizeBroadcastResult(
    payload,
    "Nenhum dispositivo recebeu o broadcast.",
  );
}

/** Envia para todos os dispositivos registados na loja (iPhone, tablet, browser). */
export async function sendBroadcastTestPushNotification(opts: {
  storeId: string;
  audience: PushTestAudience;
  title: string;
  body: string;
  alsoNotifyStaff?: boolean;
}): Promise<PushTestSendResult> {
  const { storeId, audience, title, body: msgBody, alsoNotifyStaff } = opts;
  const resolved = await resolveMarketingBroadcastCopy(storeId, title, msgBody);
  const titleResolved = resolved.title;
  const bodyResolved = resolved.body;

  pushLog("test", "broadcast_send", "info", "A enviar broadcast de teste", {
    storeId,
    audience,
    alsoNotifyStaff,
  });

  try {
    if (audience === "staff") {
      const result = await invokeStoreBroadcast({
        storeId,
        title: titleResolved,
        body: bodyResolved,
        url: "/panel/live",
      });
      if (result.ok) {
        pushLog("test", "broadcast_send", "info", `Broadcast equipa: ${result.sent ?? 0} dispositivo(s)`, result);
      }
      return result;
    }

    const marketing = await invokeStoreBroadcast({
      storeId,
      audience: "marketing",
      title: titleResolved,
      body: bodyResolved,
      url: "/",
    });

    if (!alsoNotifyStaff) return marketing;

    const staff = await invokeStoreBroadcast({
      storeId,
      title: titleResolved,
      body: bodyResolved,
      url: "/panel/live",
    });

    const sent = (marketing.sent ?? 0) + (staff.sent ?? 0);
    const matched = (marketing.matched ?? 0) + (staff.matched ?? 0);
    const targeted = (marketing.targeted ?? 0) + (staff.targeted ?? 0);
    const ok = sent > 0;
    const userMessage =
      sent === 0
        ? "Nenhum dispositivo recebeu. Registe clientes no menu e equipa na app."
        : !marketing.ok && staff.ok
          ? `Só a equipa recebeu (${staff.sent}). Nenhum cliente com notificações activas.`
          : !staff.ok && marketing.ok
            ? `Só clientes receberam (${marketing.sent}). Nenhum dispositivo da equipa registado.`
            : undefined;

    return {
      ok,
      sent,
      matched,
      targeted,
      userMessage,
      errors: [...(marketing.errors ?? []), ...(staff.errors ?? [])],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "broadcast_send", "error", message);
    return { ok: false, error: message, userMessage: message };
  }
}

export async function sendTestPushNotification(opts: {
  storeId: string;
  audience: PushTestAudience;
  title: string;
  body: string;
}): Promise<PushTestSendResult> {
  const { storeId, audience, title, body: msgBody } = opts;
  const directSubscription = await getLocalPushSubscription();

  pushLog("test", "test_send", "info", "A enviar notificação de teste", {
    storeId,
    audience,
    title,
    hasThisDevice: Boolean(directSubscription),
  });

  if (!directSubscription) {
    const userMessage = "Este browser ainda não está registado, carregue em «Registar push neste dispositivo» primeiro.";
    pushLog("test", "test_send", "warn", userMessage);
    return { ok: false, userMessage };
  }

  try {
    const { data, error } = await invokePushFunction({
      storeId,
      audience: audience === "marketing" ? "marketing" : undefined,
      title,
      body: msgBody,
      tag: `push-test-${Date.now()}`,
      url: audience === "staff" ? "/panel/live" : "/",
      testDirect: true,
      directSubscription,
      pushDiagnostic: true,
    });

    if (error) {
      const userMessage = formatInvokeError(error);
      pushLog("test", "test_send", "error", "Função de envio push falhou no servidor", {
        message: error.message,
        userMessage,
        name: error.name,
      });
      return { ok: false, error: error.message, userMessage };
    }

    const result = finalizeWebDirectResult(parseSendPayload(data));

    if (result.ok) {
      pushLog("test", "test_send", "info", `Notificação enviada para este browser`, result);
    } else {
      pushLog("test", "test_send", "error", result.userMessage ?? "Falha no envio", result);
    }

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "test_send", "error", message);
    return { ok: false, error: message, userMessage: message };
  }
}

/** Teste directo no iPhone/Android, envia só para o token deste telemóvel (sem broadcast). */
export async function sendNativeDeviceTestPush(opts: {
  storeId: string;
  title: string;
  body: string;
}): Promise<PushTestSendResult> {
  const { storeId, title, body: msgBody } = opts;
  const token = readCachedNativePushToken();
  const device = await getLocalDevicePushStatus();

  pushLog("test", "test_send", "info", "A enviar teste directo para este telemóvel", {
    storeId,
    hasToken: Boolean(token),
    platform: device.mode,
  });

  if (!token || device.mode !== "native") {
    const userMessage = "Este telemóvel ainda não tem token, toque em «Registar push» primeiro.";
    pushLog("test", "test_send", "warn", userMessage);
    return { ok: false, userMessage };
  }

  let nativePlatform: "ios" | "android" = "ios";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() === "android") nativePlatform = "android";
  } catch {
    /* default ios */
  }

  try {
    const { data, error } = await invokePushFunction({
      storeId,
      title,
      body: msgBody,
      tag: `push-native-test-${Date.now()}`,
      url: "/panel/live",
      testDirect: true,
      pushDiagnostic: true,
      nativeDirectToken: token,
      nativePlatform,
    });

    if (error) {
      const userMessage = formatInvokeError(error);
      pushLog("test", "test_send", "error", "Envio directo falhou no servidor", {
        message: error.message,
        userMessage,
      });
      return { ok: false, error: error.message, userMessage };
    }

    const result = finalizeNativeDirectResult(parseSendPayload(data), nativePlatform);

    if (result.ok) {
      pushLog("test", "test_send", "info", `Notificação enviada para este telemóvel`, result);
    } else {
      pushLog("test", "test_send", "error", result.userMessage ?? "Falha no envio directo", result);
    }

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "test_send", "error", message);
    return { ok: false, error: message, userMessage: message };
  }
}
