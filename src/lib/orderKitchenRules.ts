/** Quando o pedido pode ir para cozinha / imprimir ticket. */
export type KitchenOrderLike = {
  order_type?: string | null;
  payment_status?: string | null;
  table_validated?: boolean | null;
  kitchen_printed_at?: string | null;
};

export function orderReadyForKitchen(order: KitchenOrderLike): boolean {
  if (order.payment_status === "paid") return true;
  if (order.order_type === "dine_in" && order.table_validated) return true;
  return false;
}

export function needsPaymentBeforeKitchen(order: KitchenOrderLike): boolean {
  if (order.order_type === "takeaway" || order.order_type === "delivery") return true;
  return false;
}
