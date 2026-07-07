import { supabase } from "@/integrations/supabase/client";

export type CancelOrderRefundResult = {
  success: boolean;
  refundMode?: "stripe" | "manual_cash" | "none";
  refunded?: boolean;
  manualRefundRequired?: boolean;
  orderNumber?: string;
  cancelledByName?: string;
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

/** Cancela pedido com PIN; reembolso automático Stripe se pagamento online confirmado. */
export async function cancelOrderWithRefund(
  storeId: string,
  orderId: string,
  staffPin: string,
  reason = "Pedido cancelado pelo restaurante",
): Promise<CancelOrderRefundResult> {
  const pin = staffPin?.trim();
  if (!pin) {
    return { success: false, error: "Introduza o código pessoal para cancelar" };
  }

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

  if (needsStripeRefund) {
    const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
      body: {
        action: "refund_order",
        storeId,
        orderId,
        reason,
        staffPin: pin,
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
        cancelledByName: payload.cancelledByName,
      };
    }

    return {
      success: false,
      error: payload?.error || error?.message || "Não foi possível cancelar o pedido pago online",
    };
  }

  const { data, error } = await supabase.rpc("cancel_order_with_staff_pin", {
    _order_id: orderId,
    _staff_pin: pin,
    _reason: reason,
  });

  if (error) {
    return { success: false, error: error.message || "Não foi possível cancelar o pedido" };
  }

  const payload = data as {
    success?: boolean;
    order_number?: string;
    cancelled_by_name?: string;
  } | null;

  if (!payload?.success) {
    return { success: false, error: "Não foi possível cancelar o pedido" };
  }

  return {
    success: true,
    refundMode: orderRow.payment_status === "paid" ? "manual_cash" : "none",
    refunded: false,
    manualRefundRequired: orderRow.payment_status === "paid",
    orderNumber: payload.order_number ?? orderRow.order_number ?? undefined,
    cancelledByName: payload.cancelled_by_name,
  };
}
