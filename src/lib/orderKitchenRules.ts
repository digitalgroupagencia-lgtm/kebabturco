/** Quando o pedido pode ir para cozinha / imprimir ticket. */
export type KitchenOrderLike = {
  order_type?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  stripe_payment_intent_id?: string | null;
  status?: string | null;
  table_validated?: boolean | null;
  kitchen_printed_at?: string | null;
};

const ONLINE_PAYMENT_METHODS = new Set(["card", "bizum", "apple_pay", "google_pay", "pix"]);

/** Cliente abriu cartão/Bizum na app mas o Stripe ainda não confirmou o pagamento. */
export function isAwaitingOnlinePaymentConfirmation(order: KitchenOrderLike): boolean {
  if (order.payment_status === "paid") return false;
  if (order.payment_method && ONLINE_PAYMENT_METHODS.has(order.payment_method)) return true;
  if (order.stripe_payment_intent_id) return true;
  return false;
}

/** Dinheiro ou balcão, deve aparecer no painel para o staff confirmar o pagamento. */
export function isAwaitingCounterPaymentConfirmation(order: KitchenOrderLike): boolean {
  if (order.payment_status === "paid") return false;
  if (isAwaitingOnlinePaymentConfirmation(order)) return false;
  if (order.order_type === "dine_in") return false;
  return order.order_type === "takeaway" || order.order_type === "delivery";
}

/** Pedidos visíveis no painel ao vivo / caixa (exclui checkout online abandonado). */
export function isConfirmedPaidOrder(order: { payment_status?: string | null }): boolean {
  return order.payment_status === "paid";
}

export function shouldShowOrderInRestaurantPanel(order: KitchenOrderLike): boolean {
  if (order.status === "cancelled") return true;
  if (order.payment_status === "paid") return true;
  if (order.order_type === "dine_in") return true;
  if (isAwaitingOnlinePaymentConfirmation(order)) return false;
  return true;
}

export function orderReadyForKitchen(order: KitchenOrderLike): boolean {
  if (order.payment_status === "paid") return true;
  if (order.order_type === "dine_in" && order.table_validated) return true;
  return false;
}

export function needsPaymentBeforeKitchen(order: KitchenOrderLike): boolean {
  if (order.order_type === "takeaway") return true;
  return false;
}

export function blocksOperationalProgressUntilPaid(order: KitchenOrderLike): boolean {
  return isAwaitingCounterPaymentConfirmation(order);
}
