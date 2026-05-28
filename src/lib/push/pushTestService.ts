import { supabase } from "@/integrations/supabase/client";
import { pushLog } from "@/lib/push/pushLogger";

export type PushTestAudience = "staff" | "marketing";

export type PushTestSendResult = {
  ok: boolean;
  sent?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

export async function sendTestPushNotification(opts: {
  storeId: string;
  audience: PushTestAudience;
  title: string;
  body: string;
}): Promise<PushTestSendResult> {
  const { storeId, audience, title, body } = opts;

  pushLog("test", "test_send", "info", "A enviar notificação de teste", {
    storeId,
    audience,
    title,
  });

  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        storeId,
        audience: audience === "marketing" ? "marketing" : undefined,
        title,
        body,
        tag: `push-test-${Date.now()}`,
        url: audience === "staff" ? "/panel/live" : "/",
      },
    });

    if (error) {
      pushLog("test", "test_send", "error", "Edge function send-push-notification falhou", {
        message: error.message,
        name: error.name,
      });
      return { ok: false, error: error.message };
    }

    const payload = data as { sent?: number; skipped?: boolean; reason?: string; error?: string };

    if (payload.error) {
      pushLog("test", "test_send", "error", payload.error);
      return { ok: false, error: payload.error };
    }

    if (payload.skipped) {
      pushLog("test", "test_send", "warn", "Envio ignorado — VAPID não configurado no servidor", {
        reason: payload.reason,
      });
      return { ok: false, skipped: true, reason: payload.reason ?? "VAPID not configured" };
    }

    pushLog("test", "test_send", "info", `Notificação enviada para ${payload.sent ?? 0} dispositivo(s)`, {
      sent: payload.sent,
    });

    return { ok: true, sent: payload.sent ?? 0 };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog("test", "test_send", "error", message);
    return { ok: false, error: message };
  }
}
