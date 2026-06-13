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

async function cancelOrderDirect(
  storeId: string,
  orderId: string,
  reason: string,
  order: {
    payment_status?: string | null;
    order_number?: string | null;
  },
): Promise<CancelOrderRefundResult> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (error) {
    return { success: false, error: error.message || "Não foi possível cancelar o pedido" };
  }

  return {
    success: true,
    refundMode: order.payment_status === "paid" ? "manual_cash" : "none",
    refunded: false,
    manualRefundRequired: order.payment_status === "paid",
    orderNumber: order.order_number ?? undefined,
  };
}

/** Cancela pedido; reembolso automático Stripe se pagamento online confirmado. */
export async function cancelOrderWithRefund(
  storeId: string,
  orderId: string,
  reason = "Pedido cancelado pelo restaurante",
): Promise<CancelOrderRefundResult> {
  const { data: orderRow, error: loadErr } = await supabase
    .from("orders")
    .select("id, store_id, order_number, status, payment_status, payment_method, stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();

  if (loadErr || !orderRow || orderRow.store_id !== storeId) {
    return { success: false, error: "Pedido não encontrado" };
  }

  if (orderRow.status === "cancelled") {
    return {
      success: true,
      refundMode: "none",
      orderNumber: orderRow.order_number ?? undefined,
    };
  }

  const needsStripeRefund = orderNeedsOnlineRefund(orderRow);

  const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
    body: {
      action: "refund_order",
      storeId,
      orderId,
      reason,
    },
  });

  const payload = data as CancelOrderRefundResult & { error?: string };
  if (!error && payload?.success) {
    return {
      success: true,
      refundMode: payload.refundMode,
      refunded: payload.refunded,
      manualRefundRequired: payload.manualRefundRequired,
      orderNumber: payload.orderNumber ?? orderRow.order_number ?? undefined,
    };
  }

  if (needsStripeRefund) {
    return {
      success: false,
      error: payload?.error || error?.message || "Não foi possível cancelar o pedido pago online",
    };
  }

  return cancelOrderDirect(storeId, orderId, reason, orderRow);
}
