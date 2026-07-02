import type { Database } from "@/integrations/supabase/types";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { panelT } from "@/lib/staffPanelLocale";
import type { StaffI18nKey } from "@/lib/staffI18n";
import { isAwaitingOnlinePaymentConfirmation } from "@/lib/orderKitchenRules";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

export type PanelOrderAction =
  | { kind: "accept_eta"; label: string }
  | { kind: "advance"; next: OrderStatus; label: string }
  | { kind: "assign_driver"; label: string }
  | { kind: "delivery_code"; label: string }
  | { kind: "start_delivery"; label: string };

const ACTION_LABEL_KEYS: Record<string, StaffI18nKey> = {
  accept_eta: "order.action.accept",
  advance_ready: "order.action.mark_ready",
  advance_delivered: "order.action.delivered",
  assign_driver: "order.action.assign_driver",
  delivery_code: "order.action.finish_delivery",
  start_delivery: "order.action.start_delivery",
};

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

export function getPanelOrderAction(
  order: {
    status: string;
    order_type?: string | null;
    table_number?: string | null;
    delivery_street?: string | null;
    assigned_driver_id?: string | null;
    payment_status?: string | null;
  },
  options?: { viewerUserId?: string | null; canAssignDriver?: boolean; lang?: StaffUiLang },
): PanelOrderAction | null {
  const status = order.status;
  const type = resolveOrderType(order);
  const viewerUserId = options?.viewerUserId ?? null;
  const canAssignDriver = options?.canAssignDriver ?? true;
  const lang = options?.lang;

  const label = (key: StaffI18nKey) => panelT(lang, key);

  if (status === "pending") {
    if (isAwaitingOnlinePaymentConfirmation(order)) return null;
    if (type === "takeaway" && order.payment_status !== "paid") return null;
    return { kind: "accept_eta", label: label(ACTION_LABEL_KEYS.accept_eta) };
  }
  if (status === "preparing") {
    return { kind: "advance", next: "ready", label: label(ACTION_LABEL_KEYS.advance_ready) };
  }
  if (status === "ready" || status === "out_for_delivery") {
    if (type === "delivery") {
      if (status === "out_for_delivery") {
        if (order.assigned_driver_id && order.assigned_driver_id === viewerUserId) {
          return { kind: "delivery_code", label: label(ACTION_LABEL_KEYS.delivery_code) };
        }
        return null;
      }
      if (!order.assigned_driver_id && canAssignDriver) {
        return { kind: "assign_driver", label: label(ACTION_LABEL_KEYS.assign_driver) };
      }
      if (order.assigned_driver_id && order.assigned_driver_id === viewerUserId) {
        return { kind: "start_delivery", label: label(ACTION_LABEL_KEYS.start_delivery) };
      }
      return null;
    }
    return { kind: "advance", next: "delivered", label: label(ACTION_LABEL_KEYS.advance_delivered) };
  }
  return null;
}

export function customerTrackingStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "pending") return 0;
  if (status === "preparing") return 1;
  if (status === "ready") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered") return 4;
  return 0;
}
