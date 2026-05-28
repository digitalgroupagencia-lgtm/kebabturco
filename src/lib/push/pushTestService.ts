import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import { pushLog } from "@/lib/push/pushLogger";

export type PushTestAudience = "staff" | "marketing";

export type PushTestSendResult = {
  ok: boolean;
  sent?: number;
  matched?: number;
  targeted?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
  userMessage?: string;
};

export type ServerVapidDiagnostics = {
  configured: boolean;
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  publicKeyPreview: string | null;
  keysMatchClient: boolean | null;
  probeError?: string;
};

const SERVER_VAPID_REASON_PT: Record<string, string> = {
  "VAPID not configured":
    "O servidor não tem as chaves VAPID (pública + privada). Configure nos segredos da Lovable Cloud.",
};

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
      publicKeyPreview?: string | null;
    };

    const clientKey = getVapidPublicKey();
    let keysMatchClient: boolean | null = null;
    if (payload.configured && clientKey && payload.publicKeyPreview) {
      const clientPreview =
        clientKey.length <= 16 ? clientKey : `${clientKey.slice(0, 12)}…${clientKey.slice(-6)}`;
      keysMatchClient = clientPreview === payload.publicKeyPreview;
    }

    const result: ServerVapidDiagnostics = {
      configured: Boolean(payload.configured),
      hasPublicKey: Boolean(payload.hasPublicKey),
      hasPrivateKey: Boolean(payload.hasPrivateKey),
      publicKeyPreview: payload.publicKeyPreview ?? null,
      keysMatchClient,
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
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        storeId,
        audience: audience === "marketing" ? "marketing" : undefined,
        title,
        body: msgBody,
        tag: `push-test-${Date.now()}`,
        url: audience === "staff" ? "/panel/live" : "/",
        testDirect: true,
        directSubscription,
      },
    });

    if (error) {
      pushLog("test", "test_send", "error", "Função de envio push falhou no servidor", {
        message: error.message,
        name: error.name,
      });
      return { ok: false, error: error.message, userMessage: "Erro ao contactar o servidor de push" };
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

    if (sent === 0) {
      const userMessage =
        "Nenhum dispositivo recebeu. Registe de novo com o mesmo tipo e a mesma loja seleccionada.";
      pushLog("test", "test_send", "warn", userMessage, { matched, targeted: payload.targeted });
      return { ok: false, sent: 0, matched, userMessage };
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
