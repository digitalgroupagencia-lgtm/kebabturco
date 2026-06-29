import type { Database } from "@/integrations/supabase/types";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { normalizeFinancePaymentMethod } from "@/lib/financeChartColors";
import { getPanelOrderAction, isDeliveryOrder, resolveOrderType } from "@/lib/orderOperationalFlow";
import { panelT } from "@/lib/staffPanelLocale";
import type { StaffI18nKey } from "@/lib/staffI18n";

export type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

const STATUS_KEYS: Record<string, StaffI18nKey> = {
  pending: "order.status.pending",
  preparing: "order.status.preparing",
  ready: "order.status.ready",
  out_for_delivery: "order.status.out_for_delivery",
  delivered: "order.status.delivered",
  cancelled: "order.status.cancelled",
};

const PAYMENT_METHOD_KEYS: Record<string, StaffI18nKey> = {
  cash: "order.payment.cash_label",
  card: "order.payment.card_label",
  bizum: "order.payment.bizum_label",
  stripe: "order.payment.card_label",
  online: "order.payment.card_label",
};

export function getStatusFlow(_orderType?: string | null): OrderStatus[] {
  return ["pending", "preparing", "ready", "out_for_delivery", "delivered"];
}

export function getStatusLabel(status: string, orderType?: string | null, lang?: StaffUiLang): string {
  const key = STATUS_KEYS[status];
  return key ? panelT(lang, key) : status;
}

export function getNextAction(
  status: string,
  orderType?: string | null,
  order?: {
    table_number?: string | null;
    delivery_street?: string | null;
    assigned_driver_id?: string | null;
  },
  lang?: StaffUiLang,
): { next: OrderStatus; label: string } | null {
  const action = getPanelOrderAction(
    {
      status,
      order_type: orderType,
      table_number: order?.table_number,
      delivery_street: order?.delivery_street,
      assigned_driver_id: order?.assigned_driver_id,
    },
    { lang },
  );
  if (!action || action.kind !== "advance") return null;
  return { next: action.next, label: action.label };
}

export function getOrderModalityBanner(
  order: {
    order_type?: string | null;
    table_number?: string | null;
    delivery_street?: string | null;
    source?: string | null;
  },
  lang?: StaffUiLang,
) {
  const resolvedType = resolveOrderType(order);

  if (resolvedType === "delivery") {
    return {
      label: panelT(lang, "order.modality.delivery_banner"),
      detail: panelT(lang, "order.modality.delivery_detail"),
      tone: "delivery" as const,
    };
  }
  if (resolvedType === "takeaway") {
    return {
      label: panelT(lang, "order.modality.takeaway_banner"),
      detail: panelT(lang, "order.modality.takeaway_detail"),
      tone: "takeaway" as const,
    };
  }
  if (resolvedType === "dine_in") {
    if (order.table_number) {
      return {
        label: panelT(lang, "order.modality.dine_in_table", { table: order.table_number }),
        detail: panelT(lang, "order.modality.dine_in_detail"),
        tone: "dine_in" as const,
      };
    }
    return {
      label: panelT(lang, "order.modality.dine_in_banner"),
      detail: panelT(lang, "order.modality.dine_in_restaurant"),
      tone: "dine_in" as const,
    };
  }
  return {
    label: panelT(lang, "order.modality.unknown"),
    detail: order.order_type || "—",
    tone: "unknown" as const,
  };
}

export function getPaymentMethodLabel(method: string | null | undefined, lang?: StaffUiLang): string | null {
  if (!method) return null;
  const key = normalizeFinancePaymentMethod(method);
  const mapped = PAYMENT_METHOD_KEYS[key];
  if (mapped) return panelT(lang, mapped);
  const other = panelT(lang, "order.payment.other");
  return other === "order.payment.other" ? method.replace(/_/g, " ") : other;
}

export function getPanelPaymentBadge(
  order: {
    payment_status?: string | null;
    payment_method?: string | null;
    source?: string | null;
  },
  lang?: StaffUiLang,
): { label: string; tone: "paid" | "pending"; methodLabel: string | null } {
  const methodLabel = getPaymentMethodLabel(order.payment_method, lang);

  if (order.payment_status === "paid") {
    return { label: panelT(lang, "order.payment.paid"), tone: "paid", methodLabel };
  }
  if (order.payment_method === "cash") {
    return {
      label: panelT(lang, "order.payment.cash"),
      tone: "pending",
      methodLabel: panelT(lang, "order.payment.cash_label"),
    };
  }
  if (order.payment_method === "card") {
    return {
      label: panelT(lang, "order.payment.card_pending"),
      tone: "pending",
      methodLabel: panelT(lang, "order.payment.card_label"),
    };
  }
  if (order.payment_method === "bizum") {
    return {
      label: panelT(lang, "order.payment.bizum_pending"),
      tone: "pending",
      methodLabel: panelT(lang, "order.payment.bizum_label"),
    };
  }
  return { label: panelT(lang, "order.payment.pending"), tone: "pending", methodLabel };
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

export function getLiveStatusHeadline(status: string, orderType?: string | null, lang?: StaffUiLang): string {
  return getStatusLabel(status, orderType, lang);
}
