import { supabase } from "@/integrations/supabase/client";

export type CancelOrderRefundResult = {
  success: boolean;
  refundMode?: "stripe" | "manual_cash" | "none";
  refunded?: boolean;
  manualRefundRequired?: boolean;
  orderNumber?: string;
  error?: string;
};

const ONLINE_METHODS = new Set(["card", "apple_pay", "google_pay", "bizum", "pix"]);

export function orderNeedsOnlineRefund(order: {
  payment_status?: string | null;
  payment_method?: string | null;
  stripe_payment_intent_id?: string | null;
}) {
  return (
    order.payment_status === "paid" &&
    Boolean(order.stripe_payment_intent_id) &&
    order.payment_method != null &&
    ONLINE_METHODS.has(order.payment_method)
  );
}

/** Cancela pedido; reembolso automático Stripe se pagamento online confirmado. */
export async function cancelOrderWithRefund(
  storeId: string,
  orderId: string,
  reason = "Pedido cancelado pelo restaurante",
): Promise<CancelOrderRefundResult> {
  const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
    body: {
      action: "refund_order",
      storeId,
      orderId,
      reason,
    },
  });

  if (error) {
    return { success: false, error: error.message || "Não foi possível cancelar o pedido" };
  }

  const payload = data as CancelOrderRefundResult & { error?: string };
  if (payload?.error) {
    return { success: false, error: payload.error };
  }

  return {
    success: Boolean(payload?.success),
    refundMode: payload.refundMode,
    refunded: payload.refunded,
    manualRefundRequired: payload.manualRefundRequired,
    orderNumber: payload.orderNumber,
  };
}
