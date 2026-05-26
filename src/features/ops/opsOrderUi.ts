import type { Tables } from "@/integrations/supabase/types";
import { getOrderModalityBanner, getNextAction, type OrderStatus } from "@/lib/orderStatusLabels";
import type { PanelOrder } from "./usePanelOrders";

export const ETA_QUICK_OPTIONS = [10, 15, 20, 25, 30] as const;

export type OrderItem = Tables<"order_items">;

export function orderItemCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatOrderClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function formatOrderEta(order: { estimated_ready_at?: string | null }): string | null {
  if (!order.estimated_ready_at) return null;
  return formatOrderClock(order.estimated_ready_at);
}

export function prepMinutesFromNow(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60_000));
}

export function requiresEtaBeforeAccept(status: string, nextStatus: OrderStatus): boolean {
  return status === "pending" && nextStatus === "preparing";
}

export function getModalityShortLabel(order: PanelOrder): string {
  const banner = getOrderModalityBanner(order);
  if (banner.tone === "dine_in" && order.table_number) return `M${order.table_number}`;
  if (banner.tone === "takeaway") return "Balcão";
  if (banner.tone === "delivery") return "Entrega";
  return banner.label.slice(0, 8);
}

export function getCompactActionLabel(order: PanelOrder): string | null {
  const next = getNextAction(order.status, order.order_type);
  if (!next) return null;
  if (order.status === "pending" && next.next === "preparing") return "Aceitar";
  if (next.next === "ready") return "Pronto";
  if (next.next === "out_for_delivery") return "Enviar";
  if (next.next === "delivered") {
    if (order.order_type === "delivery") return "Entregue";
    if (order.order_type === "takeaway") return "Recolhido";
    return "Servido";
  }
  return "Avançar";
}

export function compactCardBorderClass(status: string): string {
  const map: Record<string, string> = {
    pending: "border-l-4 border-l-red-500",
    preparing: "border-l-4 border-l-amber-500",
    ready: "border-l-4 border-l-green-500",
    out_for_delivery: "border-l-4 border-l-blue-500",
    delivered: "border-l-4 border-l-muted-foreground/40 opacity-70",
    cancelled: "border-l-4 border-l-destructive/60 opacity-60",
  };
  return map[status] ?? "border-l-4 border-l-border";
}

export function validateAcceptPrepMinutes(minutes: number | undefined): minutes is number {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 5 && minutes <= 180;
}
