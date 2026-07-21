import { supabase } from "@/integrations/supabase/client";
import {
  buildMarketingBroadcastI18n,
  type MarketingBroadcastI18n,
} from "@/lib/marketing/resolveMarketingBroadcast";

export async function notifyOrderStatusChange(
  orderId: string,
  status: string,
  _orderNumber?: string,
  _lang = "es",
) {
  // Não enviar title/body fixos — o edge monta o texto com o nome do cliente.
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        orderId,
        customerOrderEvent: status,
        tag: `order-${orderId}-${status}`,
        url: `/?screen=tracking&order=${orderId}`,
      },
    });
  } catch {
    // não bloqueia operação
  }
}

type StaffOrderPushResult = {
  ok: boolean;
  sent?: number;
  liveActivitySent?: number;
  liveActivityErrors?: string[];
  message: string;
};

function parseStaffOrderPushResponse(data: unknown, error: { message?: string } | null): StaffOrderPushResult {
  if (error) {
    return { ok: false, message: error.message ?? "Erro ao enviar alerta" };
  }
  const payload = (data ?? {}) as {
    sent?: number;
    error?: string;
    liveActivitySent?: number;
    liveActivityErrors?: string[];
  };
  if (payload.error) {
    return { ok: false, message: payload.error };
  }
  const sent = payload.sent ?? 0;
  const laSent = payload.liveActivitySent ?? 0;
  const laErr = payload.liveActivityErrors?.[0];

  if (sent === 0 && laSent === 0) {
    return {
      ok: false,
      sent: 0,
      liveActivitySent: 0,
      liveActivityErrors: payload.liveActivityErrors,
      message: laErr
        ? `Nenhum dispositivo recebeu. Cartão grande: ${laErr.slice(0, 120)}`
        : "Nenhum dispositivo da equipa registado para alertas nesta loja.",
    };
  }

  let message = `Alerta enviado para ${sent} dispositivo(s).`;
  if (laSent > 0) {
    message += ` Cartão grande no iPhone: ${laSent}.`;
  } else if (laErr) {
    message += ` Cartão grande: ${laErr.slice(0, 160)}`;
  } else if (sent > 0) {
    message +=
      " Só chegou a faixa pequena — na app iPhone ligue alertas (precisa iOS 17.2+) e carregue Enviar alerta outra vez.";
  }

  return {
    ok: true,
    sent,
    liveActivitySent: laSent,
    liveActivityErrors: payload.liveActivityErrors,
    message,
  };
}

async function invokeStaffOrderPush(
  storeId: string,
  orderId: string,
  opts?: { pushDiagnostic?: boolean },
): Promise<StaffOrderPushResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;

  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      storeId,
      staffOrderId: orderId,
      tag: `staff-new-order-${orderId}`,
      url: `/panel/live?order=${orderId}`,
      requireInteraction: true,
      ...(opts?.pushDiagnostic ? { pushDiagnostic: true } : {}),
    },
    headers,
  });

  return parseStaffOrderPushResponse(data, error);
}

/** Aviso push para equipa do restaurante quando entra pedido novo. */
export async function notifyStaffNewOrder(
  storeId: string,
  orderId: string,
  _orderNumber?: string,
) {
  try {
    await invokeStaffOrderPush(storeId, orderId);
  } catch {
    /* não bloqueia operação */
  }
}

/** Reenvia alerta de pedido pendente (faixa + cartão ACEITAR no iPhone). */
export async function resendStaffOrderNotification(
  storeId: string,
  orderId: string,
): Promise<StaffOrderPushResult> {
  try {
    return await invokeStaffOrderPush(storeId, orderId, { pushDiagnostic: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

/** Campanha push para clientes com app (menu ou pedidos anteriores). */
export async function notifyStoreMarketingBroadcast(
  storeId: string,
  title: string,
  body: string,
  url = "/",
  i18n?: { titleI18n: MarketingBroadcastI18n; bodyI18n: MarketingBroadcastI18n },
) {
  try {
    const payload =
      i18n ?? buildMarketingBroadcastI18n({ title, body });
    await supabase.functions.invoke("send-push-notification", {
      body: {
        storeId,
        audience: "marketing",
        title: payload.titleI18n.es || title,
        body: payload.bodyI18n.es || body,
        titleI18n: payload.titleI18n,
        bodyI18n: payload.bodyI18n,
        marketingBroadcast: true,
        tag: `marketing-${storeId}-${Date.now()}`,
        url,
      },
    });
  } catch {
    /* não bloqueia operação */
  }
}
