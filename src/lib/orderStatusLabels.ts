import type { Database } from "@/integrations/supabase/types";
import { getPanelOrderAction, isDeliveryOrder, resolveOrderType } from "@/lib/orderOperationalFlow";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

export function getStatusFlow(_orderType?: string | null): OrderStatus[] {
  return ["pending", "preparing", "ready", "delivered"];
}

export function getStatusLabel(status: string, orderType?: string | null): string {
  const type = orderType ? resolveOrderType({ order_type: orderType }) : null;
  const map: Record<string, string> = {
    pending: "Pedido recebido",
    preparing: "Em preparação",
    ready: "Pronto para entrega",
    out_for_delivery: "Pronto para entrega",
    delivered: "Pedido entregue",
    cancelled: "Cancelado",
  };
  if (status === "delivered" && type === "takeaway") {
    return "Pedido entregue";
  }
  return map[status] || status;
}

export function getNextAction(
  status: string,
  orderType?: string | null,
  order?: { table_number?: string | null; delivery_street?: string | null },
): { next: OrderStatus; label: string } | null {
  const action = getPanelOrderAction({
    status,
    order_type: orderType,
    table_number: order?.table_number,
    delivery_street: order?.delivery_street,
  });
  if (!action || action.kind !== "advance") return null;
  return { next: action.next, label: action.label };
}

export function getOrderModalityBanner(order: {
  order_type?: string | null;
  table_number?: string | null;
  delivery_street?: string | null;
  source?: string | null;
}) {
  const resolvedType = resolveOrderType(order);

  if (resolvedType === "delivery") {
    return { label: "ENTREGA", detail: "Delivery a domicílio", tone: "delivery" as const };
  }
  if (resolvedType === "takeaway") {
    return { label: "BALCÃO", detail: "Para levar — recolha no balcão", tone: "takeaway" as const };
  }
  if (resolvedType === "dine_in") {
    if (order.table_number) {
      return { label: `MESA ${order.table_number}`, detail: "Comer no local", tone: "dine_in" as const };
    }
    return { label: "MESA", detail: "Comer no restaurante", tone: "dine_in" as const };
  }
  return { label: "PEDIDO", detail: order.order_type || "—", tone: "unknown" as const };
}

export function getPanelPaymentBadge(order: {
  payment_status?: string | null;
  payment_method?: string | null;
  source?: string | null;
}) {
  if (order.payment_status === "paid") {
    return { label: "PAGO", tone: "paid" as const };
  }
  if (order.payment_method === "cash") {
    return { label: "DINHEIRO", tone: "pending" as const };
  }
  if (order.payment_method === "card") {
    return { label: "CARTÃO PEND.", tone: "pending" as const };
  }
  return { label: "PAG. PENDENTE", tone: "pending" as const };
}

export function getCustomerTrackingSteps(orderType: string | null | undefined) {
  const isDelivery = orderType === "delivery";
  const readyLabel = isDelivery ? "Pronto para entrega" : "Pronto para entrega";
  const deliveredLabel = isDelivery ? "Entregue" : orderType === "takeaway" ? "Recolhido" : "Servido";

  return [
    { key: "pending", label: "Recebido", icon: "📥" },
    { key: "preparing", label: "A preparar", icon: "👨‍🍳" },
    { key: "ready", label: readyLabel, icon: "📦" },
    { key: "delivered", label: deliveredLabel, icon: "🎉" },
  ];
}

/** Cliente pode confirmar recepção quando o restaurante avançou o pedido o suficiente. */
export function canCustomerConfirmReceipt(status: string, orderType?: string | null): boolean {
  if (status === "delivered") return true;
  if (isDeliveryOrder({ order_type: orderType }) && (status === "ready" || status === "out_for_delivery")) {
    return true;
  }
  if (orderType === "takeaway" && status === "ready") return true;
  if (orderType === "dine_in" && status === "ready") return true;
  return false;
}

export function getLiveStatusHeadline(status: string, orderType?: string | null): string {
  return getStatusLabel(status, orderType);
}
