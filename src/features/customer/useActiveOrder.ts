import { useCallback, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { getStatusLabel } from "@/lib/orderStatusLabels";
import { useOrderTracking, type PublicOrderTrack } from "@/hooks/useOrderTracking";
import { clearStoredActiveOrder } from "./useActiveOrderStorage";

export {
  ACTIVE_ORDER_STORAGE_KEY,
  loadStoredActiveOrder,
  loadAnyStoredActiveOrder,
  saveStoredActiveOrder,
  clearStoredActiveOrder,
  type StoredActiveOrder,
} from "./useActiveOrderStorage";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

export function useActiveOrder() {
  const { activeOrderId, orderNumber, setActiveOrderId, setTrackingOrderId, setScreen } = useOrder();
  const [order, setOrder] = useState<PublicOrderTrack | null>(null);
  const [loading, setLoading] = useState(false);

  const onOrder = useCallback(
    (row: PublicOrderTrack | null) => {
      setOrder(row);
      if (row && TERMINAL_STATUSES.has(row.status)) {
        clearStoredActiveOrder();
        setActiveOrderId("");
      }
    },
    [setActiveOrderId],
  );

  useOrderTracking(activeOrderId || null, onOrder, setLoading);

  const trackOrder = () => {
    if (!activeOrderId) return;
    setTrackingOrderId(activeOrderId);
    setScreen("tracking");
  };

  const dismiss = () => {
    clearStoredActiveOrder();
    setActiveOrderId("");
    setOrder(null);
  };

  const hasActiveOrder = !!activeOrderId && (!order || !TERMINAL_STATUSES.has(order.status));
  const isLoadingOrder = !!activeOrderId && loading && !order;

  return {
    order,
    loading: loading && !!activeOrderId,
    isLoadingOrder,
    hasActiveOrder,
    displayNumber: order?.order_number || orderNumber,
    statusLabel: order ? getStatusLabel(order.status, order.order_type) : "",
    trackOrder,
    dismiss,
  };
}
