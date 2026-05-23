import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

export function getStatusFlow(orderType: string | null | undefined): OrderStatus[] {
  if (orderType === "delivery") {
    return ["pending", "preparing", "ready", "out_for_delivery", "delivered"];
  }
  if (orderType === "takeaway") {
    return ["pending", "preparing", "ready", "delivered"];
  }
  return ["pending", "preparing", "ready", "delivered"];
}

export function getStatusLabel(status: string, orderType?: string | null): string {
  const isDelivery = orderType === "delivery";
  const isTakeaway = orderType === "takeaway";
  const map: Record<string, string> = {
    pending: "Pedido recebido",
    preparing: "Em preparação",
    ready: isTakeaway ? "Pronto para recolher" : isDelivery ? "Pronto — a aguardar estafeta" : "Pronto para servir",
    out_for_delivery: "A caminho",
    delivered: isDelivery ? "Entregue" : isTakeaway ? "Recolhido" : "Entregue na mesa",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}

export function getNextAction(status: string, orderType?: string | null): { next: OrderStatus; label: string } | null {
  const flow = getStatusFlow(orderType);
  const idx = flow.indexOf(status as OrderStatus);
  if (idx < 0 || idx >= flow.length - 1) return null;
  const next = flow[idx + 1];
  const labels: Record<string, string> = {
    preparing: "Aceitar → Em preparação",
    ready: "Marcar pronto",
    out_for_delivery: "Saiu para entrega",
    delivered: orderType === "delivery" ? "Entregue" : orderType === "takeaway" ? "Recolhido" : "Entregue na mesa",
  };
  return { next, label: labels[next] || "Avançar" };
}

export function getOrderModalityBanner(order: {
  order_type?: string | null;
  table_number?: string | null;
  delivery_street?: string | null;
  source?: string | null;
}) {
  const resolvedType =
    order.order_type ||
    (order.delivery_street ? "delivery" : order.table_number ? "dine_in" : "takeaway");

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
  if (orderType === "delivery") {
    return [
      { key: "pending", label: "Recebido", icon: "📥" },
      { key: "preparing", label: "A preparar", icon: "👨‍🍳" },
      { key: "ready", label: "Pronto", icon: "✅" },
      { key: "out_for_delivery", label: "A caminho", icon: "🛵" },
      { key: "delivered", label: "Entregue", icon: "🎉" },
    ];
  }
  if (orderType === "takeaway") {
    return [
      { key: "pending", label: "Recebido", icon: "📥" },
      { key: "preparing", label: "A preparar", icon: "👨‍🍳" },
      { key: "ready", label: "Pronto", icon: "✅" },
      { key: "delivered", label: "Recolhido", icon: "🎉" },
    ];
  }
  return [
    { key: "pending", label: "Recebido", icon: "📥" },
    { key: "preparing", label: "A preparar", icon: "👨‍🍳" },
    { key: "ready", label: "Pronto", icon: "✅" },
    { key: "delivered", label: "Servido", icon: "🎉" },
  ];
}

/** Cliente pode confirmar recepção quando o restaurante avançou o pedido o suficiente. */
export function canCustomerConfirmReceipt(status: string, orderType?: string | null): boolean {
  if (status === "delivered") return true;
  if (orderType === "delivery" && status === "out_for_delivery") return true;
  if (orderType === "takeaway" && status === "ready") return true;
  if (orderType === "dine_in" && status === "ready") return true;
  return false;
}

export function getLiveStatusHeadline(status: string, orderType?: string | null): string {
  return getStatusLabel(status, orderType);
}
