import type { Tables } from "@/integrations/supabase/types";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { getOrderModalityBanner, type OrderStatus } from "@/lib/orderStatusLabels";
import { getPanelOrderAction, panelColumnStatus } from "@/lib/orderOperationalFlow";
import { canAssignDeliveryDriver } from "@/lib/staffPermissions";
import { formatStaffPanelTime, panelT } from "@/lib/staffPanelLocale";
import type { PanelOrder } from "./usePanelOrders";

export const ETA_QUICK_OPTIONS = [10, 15, 20, 25, 30] as const;

export type OrderItem = Tables<"order_items">;

export function orderItemCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatOrderClock(iso: string, lang?: StaffUiLang): string {
  return formatStaffPanelTime(iso, lang);
}

export function formatOrderEta(order: { estimated_ready_at?: string | null }, lang?: StaffUiLang): string | null {
  if (!order.estimated_ready_at) return null;
  return formatOrderClock(order.estimated_ready_at, lang);
}

export function prepMinutesFromNow(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60_000));
}

export function formatPrepRemaining(
  order: {
    status: string;
    estimated_ready_at?: string | null;
  },
  lang?: StaffUiLang,
): string | null {
  if (order.status !== "preparing" || !order.estimated_ready_at) return null;
  const mins = prepMinutesFromNow(order.estimated_ready_at);
  if (mins <= 0) return panelT(lang, "ops.prep.late");
  return panelT(lang, "ops.prep.remaining", { mins });
}

export function summarizeOrderItems(items: OrderItem[], max = 2): string {
  if (!items.length) return "";
  const parts = items.slice(0, max).map((it) => {
    const name = it.product_name.length > 18 ? `${it.product_name.slice(0, 16)}…` : it.product_name;
    return `${it.quantity}× ${name}`;
  });
  const extra = items.length > max ? ` +${items.length - max}` : "";
  return parts.join(", ") + extra;
}

export function requiresEtaBeforeAccept(status: string, nextStatus: OrderStatus): boolean {
  return status === "pending" && nextStatus === "preparing";
}

export function getModalityShortLabel(order: PanelOrder, lang?: StaffUiLang): string {
  const banner = getOrderModalityBanner(order, lang);
  if (banner.tone === "dine_in" && order.table_number) {
    return panelT(lang, "order.modality.short.table", { table: order.table_number });
  }
  if (banner.tone === "takeaway") return panelT(lang, "order.modality.short.counter");
  if (banner.tone === "delivery") return panelT(lang, "order.modality.short.delivery");
  return banner.label.slice(0, 8);
}

export function getCompactActionLabel(order: PanelOrder, viewerRole?: string | null, lang?: StaffUiLang): string | null {
  const action = getPanelOrderAction(order, { canAssignDriver: canAssignDeliveryDriver(viewerRole as any), lang });
  if (!action) return null;
  return action.label;
}

const STATUS_CARD_STYLES: Record<string, string> = {
  pending: "border-l-4 border-l-red-500 shadow-[inset_3px_0_12px_-4px_rgba(239,68,68,0.35)]",
  preparing: "border-l-4 border-l-yellow-500 shadow-[inset_3px_0_12px_-4px_rgba(234,179,8,0.3)]",
  ready: "border-l-4 border-l-orange-500 shadow-[inset_3px_0_12px_-4px_rgba(249,115,22,0.35)]",
  delivered: "border-l-4 border-l-green-500 shadow-[inset_3px_0_12px_-4px_rgba(34,197,94,0.25)] opacity-85",
  cancelled: "border-l-4 border-l-destructive/60 opacity-60",
};

export function compactCardBorderClass(status: string): string {
  const normalized = panelColumnStatus(status);
  return STATUS_CARD_STYLES[normalized] ?? "border-l-4 border-l-border";
}

export function columnHeaderAccentClass(status: string): string {
  const map: Record<string, string> = {
    pending: "text-red-500",
    preparing: "text-yellow-500",
    ready: "text-orange-500",
    delivered: "text-green-500",
    cancelled: "text-muted-foreground",
  };
  return map[status] ?? "text-muted-foreground";
}

export function validateAcceptPrepMinutes(minutes: number | undefined): minutes is number {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 5 && minutes <= 180;
}

export function validateDeliveryCode(code: string): boolean {
  const trimmed = code.trim();
  return /^\d{4}$/.test(trimmed);
}
