import type { Database } from "@/integrations/supabase/types";
import { getPanelOrderAction, isDeliveryOrder, resolveOrderType } from "@/lib/orderOperationalFlow";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

export function getStatusFlow(_orderType?: string | null): OrderStatus[] {
  return ["pending", "preparing", "ready", "out_for_delivery", "delivered"];
}

export function getStatusLabel(status: string, orderType?: string | null): string {
  const map: Record<string, string> = {
    pending: "Pedido recebido",
    preparing: "Em preparação",
    ready: "Pronto para entrega",
    out_for_delivery: "Saiu para entrega",
    delivered: "Pedido entregue",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}

export function getNextAction(
  status: string,
  orderType?: string | null,
  order?: {
    table_number?: string | null;
    delivery_street?: string | null;
    assigned_driver_id?: string | null;
  },
): { next: OrderStatus; label: string } | null {
  const action = getPanelOrderAction({
    status,
    order_type: orderType,
    table_number: order?.table_number,
    delivery_street: order?.delivery_street,
    assigned_driver_id: order?.assigned_driver_id,
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

const CUSTOMER_STATUS_KEYS: Record<string, string> = {
  pending: "customerStatusPending",
  preparing: "customerStatusPreparing",
  ready: "customerStatusReady",
  out_for_delivery: "customerStatusOutForDelivery",
  delivered: "customerStatusDelivered",
  cancelled: "orderCancelled",
};

export function customerStatusTranslationKey(status: string, orderType?: string | null): string {
  if (status === "delivered" && orderType === "takeaway") return "customerStatusCollected";
  if (status === "delivered" && orderType === "dine_in") return "customerStatusServed";
  return CUSTOMER_STATUS_KEYS[status] ?? status;
}

export function getCustomerTrackingSteps(
  orderType: string | null | undefined,
  t: (key: string) => string,
) {
  const isDelivery = orderType === "delivery";
  if (isDelivery) {
    return [
      { key: "pending", label: t("customerStatusPending"), icon: "📥" },
      { key: "preparing", label: t("customerStatusPreparing"), icon: "👨‍🍳" },
      { key: "ready", label: t("customerStatusReady"), icon: "📦" },
      { key: "out_for_delivery", label: t("customerStatusOutForDelivery"), icon: "🛵" },
      { key: "delivered", label: t("customerStatusDelivered"), icon: "🎉" },
    ];
  }
  const deliveredKey = orderType === "takeaway" ? "customerStatusCollected" : "customerStatusServed";
  return [
    { key: "pending", label: t("customerStatusPending"), icon: "📥" },
    { key: "preparing", label: t("customerStatusPreparing"), icon: "👨‍🍳" },
    { key: "ready", label: t("customerStatusReady"), icon: "📦" },
    { key: "delivered", label: t(deliveredKey), icon: "🎉" },
  ];
}

export function canCustomerConfirmReceipt(status: string, orderType?: string | null): boolean {
  if (status === "delivered") return true;
  if (isDeliveryOrder({ order_type: orderType }) && status === "out_for_delivery") return true;
  if (orderType === "takeaway" && status === "ready") return true;
  if (orderType === "dine_in" && status === "ready") return true;
  return false;
}

export function getLiveStatusHeadline(status: string, orderType?: string | null): string {
  return getStatusLabel(status, orderType);
}
