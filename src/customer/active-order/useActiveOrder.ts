import { useCallback, useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { customerStatusTranslationKey } from "@/lib/orderStatusLabels";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { useCustomerOrderNotifications } from "@/hooks/useCustomerOrderNotifications";
import { clearStoredActiveOrder } from "./useActiveOrderStorage";

export {
  ACTIVE_ORDER_STORAGE_KEY,
  loadStoredActiveOrder,
  loadAnyStoredActiveOrder,
  saveStoredActiveOrder,
  clearStoredActiveOrder,
  type StoredActiveOrder,
} from "./useActiveOrderStorage";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "completed"]);

export function useActiveOrder() {
  const { activeOrderId, orderNumber, setActiveOrderId, setTrackingOrderId, setScreen, storeId } =
    useOrder();
  const { t } = useLanguage();
  const [order, setOrder] = useState<PublicOrderTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchSettled, setFetchSettled] = useState(false);

  const clearActiveOrder = useCallback(() => {
    clearStoredActiveOrder();
    setActiveOrderId("");
    setTrackingOrderId("");
    setOrder(null);
  }, [setActiveOrderId, setTrackingOrderId]);

  // Quando o pedido termina (entregue/cancelado) deixamos de o tratar como activo,
  // mas mantemos o trackingOrderId para o ecrã de acompanhamento mostrar "Pedido entregue".
  const finalizeActiveOrder = useCallback(() => {
    clearStoredActiveOrder();
    setActiveOrderId("");
  }, [setActiveOrderId]);

  const onOrder = useCallback(
    (row: PublicOrderTrack | null) => {
      setOrder(row);
      setFetchSettled(true);
      if (row && TERMINAL_STATUSES.has(row.status)) {
        finalizeActiveOrder();
      }
    },
    [finalizeActiveOrder],
  );

  const onLoading = useCallback((next: boolean) => {
    setLoading(next);
    if (next) setFetchSettled(false);
  }, []);

  useOrderTracking(activeOrderId || null, onOrder, onLoading);
  useCustomerOrderNotifications(order);

  useEffect(() => {
    if (!activeOrderId) {
      setOrder(null);
      setFetchSettled(false);
    }
  }, [activeOrderId]);

  useEffect(() => {
    if (activeOrderId && isEmergencyFallbackStoreId(storeId)) {
      clearActiveOrder();
    }
  }, [activeOrderId, storeId, clearActiveOrder]);

  const trackOrder = () => {
    if (!activeOrderId) return;
    setTrackingOrderId(activeOrderId);
    setScreen("tracking");
  };

  const dismiss = () => {
    clearActiveOrder();
  };

  const hasActiveOrder = Boolean(activeOrderId && (!order || !TERMINAL_STATUSES.has(order.status)));
  const isLoadingOrder = Boolean(activeOrderId && loading && !order);

  return {
    order,
    loading: loading && !!activeOrderId,
    isLoadingOrder,
    hasActiveOrder,
    displayNumber: order?.order_number || orderNumber,
    statusLabel: order ? t(customerStatusTranslationKey(order.status, order.order_type)) : "Pedido recebido",
    trackOrder,
    dismiss,
  };
}
