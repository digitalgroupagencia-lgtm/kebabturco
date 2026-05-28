import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PublicOrderTrack } from "@/hooks/useOrderTracking";
import {
  isCustomerOrderAlertsEnabled,
  playCustomerOrderChime,
  showCustomerBrowserNotification,
} from "@/lib/customerOrderAlerts";

const STATUS_TITLE_KEYS: Record<string, string> = {
  pending: "customerStatusPending",
  preparing: "customerStatusPreparing",
  ready: "customerStatusReady",
  out_for_delivery: "customerStatusOutForDelivery",
  delivered: "customerStatusDelivered",
  collected: "customerStatusCollected",
  served: "customerStatusServed",
  cancelled: "orderCancelled",
};

function paymentTitleKey(paymentStatus?: string): string | null {
  if (paymentStatus === "paid") return "paymentConfirmedShort";
  return null;
}

/** Som + aviso no telemóvel quando o estado do pedido ou pagamento muda. */
export function useCustomerOrderNotifications(order: PublicOrderTrack | null) {
  const { t } = useLanguage();
  const prevRef = useRef<{ status?: string; payment_status?: string }>({});

  useEffect(() => {
    if (!order || !isCustomerOrderAlertsEnabled()) {
      if (order) prevRef.current = { status: order.status, payment_status: order.payment_status };
      return;
    }

    const prev = prevRef.current;
    const hadPrev = Boolean(prev.status);
    const statusChanged = hadPrev && prev.status !== order.status;
    const paymentBecamePaid = hadPrev && prev.payment_status !== "paid" && order.payment_status === "paid";

    if (statusChanged || paymentBecamePaid) {
      void playCustomerOrderChime();

      let title = `${t("orderNumber")} #${order.order_number}`;
      let body = "";

      if (paymentBecamePaid) {
        body = t(paymentTitleKey("paid") || "paymentConfirmedShort");
      }
      if (statusChanged) {
        const key = STATUS_TITLE_KEYS[order.status];
        body = key ? t(key) : order.status;
      }

      showCustomerBrowserNotification(title, body, `customer-order-${order.id}-${order.status}-${order.payment_status}`);
    }

    prevRef.current = { status: order.status, payment_status: order.payment_status };
  }, [order, t]);
}
