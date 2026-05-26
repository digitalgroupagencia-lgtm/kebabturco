import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

export type PanelOrderAction =
  | { kind: "accept_eta"; label: string }
  | { kind: "advance"; next: OrderStatus; label: string }
  | { kind: "delivery_code"; label: string };

export function resolveOrderType(order: {
  order_type?: string | null;
  table_number?: string | null;
  delivery_street?: string | null;
}): "delivery" | "takeaway" | "dine_in" {
  const resolved =
    order.order_type ||
    (order.delivery_street ? "delivery" : order.table_number ? "dine_in" : "takeaway");
  if (resolved === "delivery") return "delivery";
  if (resolved === "dine_in") return "dine_in";
  return "takeaway";
}

/** Coluna do painel — pedidos legacy em out_for_delivery aparecem em "Pronto para entrega". */
export function panelColumnStatus(status: string): OrderStatus {
  if (status === "out_for_delivery") return "ready";
  return status as OrderStatus;
}

export function isDeliveryOrder(order: {
  order_type?: string | null;
  delivery_street?: string | null;
}): boolean {
  return resolveOrderType(order) === "delivery";
}

export function generateDeliveryConfirmationCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function getPanelOrderAction(order: {
  status: string;
  order_type?: string | null;
  table_number?: string | null;
  delivery_street?: string | null;
}): PanelOrderAction | null {
  const status = order.status;
  const type = resolveOrderType(order);

  if (status === "pending") {
    return { kind: "accept_eta", label: "Aceitar" };
  }
  if (status === "preparing") {
    return { kind: "advance", next: "ready", label: "Marcar pronto" };
  }
  if (status === "ready" || status === "out_for_delivery") {
    if (type === "delivery") {
      return { kind: "delivery_code", label: "Confirmar entrega" };
    }
    return { kind: "advance", next: "delivered", label: "Pedido entregue" };
  }
  return null;
}

export function customerTrackingStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "pending") return 0;
  if (status === "preparing") return 1;
  if (status === "ready" || status === "out_for_delivery") return 2;
  if (status === "delivered") return 3;
  return 0;
}
