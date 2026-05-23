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
    preparing: status === "pending" ? "Aceitar — em preparação" : "OK — Em preparação",
    ready: "Marcar pronto",
    out_for_delivery: "Saiu para entrega",
    delivered: orderType === "delivery" ? "Entregue" : orderType === "takeaway" ? "Recolhido" : "Entregue na mesa",
  };
  return { next, label: labels[next] || "Avançar" };
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
