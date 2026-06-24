import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { pushLog } from "@/lib/push/pushLogger";
import { readCachedNativePushToken } from "@/services/nativePush";
import { getLocalDevicePushStatus } from "@/lib/push/getLocalDevicePushStatus";

export type PushTestAudience = "staff" | "marketing";

export type PushTestSendResult = {
  ok: boolean;
  sent?: number;
  matched?: number;
  targeted?: number;
  errors?: { endpoint: string; status?: number; message: string }[];
  skipped?: boolean;
  reason?: string;
  error?: string;
  userMessage?: string;
};

export type ServerVapidDiagnostics = {
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
};

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
  matched?: number;
  targeted?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
  errors?: { endpoint: string; status?: number; message: string; channel?: string }[];
} {
  return (data ?? {}) as {
    sent?: number;
    sentApns?: number;
    sentFcm?: number;
    sentWeb?: number;
    matched?: number;
    targeted?: number;
    skipped?: boolean;
    reason?: string;
    error?: string;
    errors?: { endpoint: string; status?: number; message: string; channel?: string }[];
  };
}

function apnsErrorUserMessage(message: string): string {
  if (/BadDeviceToken|DeviceTokenNotForTopic/i.test(message)) {
    return "A Apple recusou o token deste iPhone. Toque «Registar push» outra vez (com a app fechada e reaberta). Se usa a app de teste (.ipa), o servidor tem de estar em modo teste Apple (APNS_USE_SANDBOX=true).";
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

  return { ok: true, sent: channelSent, matched: payload.matched, targeted: payload.targeted };
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

  return { ok: true, sent, matched, targeted: payload.targeted, errors };
}

export function translateServerVapidReason(reason?: string): string {
  if (!reason) return "Chaves de envio não configuradas no servidor";
  return SERVER_VAPID_REASON_PT[reason] ?? reason;
}

export async function fetchServerVapidDiagnostics(): Promise<ServerVapidDiagnostics> {
  const fallback: ServerVapidDiagnostics = {
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

    const result: ServerVapidDiagnostics = {
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

    pushLog(
      "test",
      "vapid_check",
      result.configured ? "info" : "warn",
      result.configured
        ? "Servidor com chaves VAPID para envio"
        : "Servidor sem chaves VAPID — só a subscrição no site funciona",
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
    audience,
    title,
    body: msgBody,
    tag: `push-test-${Date.now()}-${audience ?? "staff"}`,
    url,
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

  return { ok: true, sent, matched, targeted: payload.targeted, errors };
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

  pushLog("test", "broadcast_send", "info", "A enviar broadcast de teste", {
    storeId,
    audience,
    alsoNotifyStaff,
  });

  try {
    if (audience === "staff") {
      const result = await invokeStoreBroadcast({
        storeId,
        title,
        body: msgBody,
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
      title,
      body: msgBody,
      url: "/",
    });

    if (!alsoNotifyStaff) return marketing;

    const staff = await invokeStoreBroadcast({
      storeId,
      title,
      body: msgBody,
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
    const userMessage = "Este browser ainda não está registado — carregue em «Registar push neste dispositivo» primeiro.";
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

    const payload = data as {
      sent?: number;
      matched?: number;
      targeted?: number;
      skipped?: boolean;
      reason?: string;
      error?: string;
    };

    if (payload.error) {
      pushLog("test", "test_send", "error", payload.error);
      return { ok: false, error: payload.error, userMessage: payload.error };
    }

    if (payload.skipped) {
      const userMessage = translateServerVapidReason(payload.reason);
      pushLog("test", "test_send", "warn", userMessage, { reason: payload.reason });
      return {
        ok: false,
        skipped: true,
        reason: payload.reason,
        userMessage,
      };
    }

    const sent = payload.sent ?? 0;
    const matched = payload.matched ?? 0;
    const errors = (payload as any).errors as
      | { endpoint: string; status?: number; message: string }[]
      | undefined;

    if (sent === 0) {
      const firstErr = errors?.[0];
      const userMessage = firstErr
        ? `Erro do serviço de push${firstErr.status ? ` (${firstErr.status})` : ""}: ${firstErr.message.slice(0, 240)}`
        : "Nenhum dispositivo recebeu. Registe de novo com o mesmo tipo e a mesma loja seleccionada.";
      pushLog("test", "test_send", "error", userMessage, { matched, targeted: payload.targeted, errors });
      return { ok: false, sent: 0, matched, targeted: payload.targeted, errors, userMessage };
    }

    pushLog("test", "test_send", "info", `Notificação enviada para ${sent} dispositivo(s)`, {
      sent,
      matched,
      targeted: payload.targeted,
    });

    return { ok: true, sent, matched, targeted: payload.targeted };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "test_send", "error", message);
    return { ok: false, error: message, userMessage: message };
  }
}

/** Teste directo no iPhone/Android — envia só para o token deste telemóvel (sem broadcast). */
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
    const userMessage = "Este telemóvel ainda não tem token — toque em «Registar push» primeiro.";
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
