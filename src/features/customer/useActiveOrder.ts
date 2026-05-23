import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { getStatusLabel } from "@/lib/orderStatusLabels";

export const ACTIVE_ORDER_STORAGE_KEY = "kiosk-active-order";

export interface StoredActiveOrder {
  orderId: string;
  orderNumber: string;
  storeId: string;
}

type PublicOrder = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
};

export function loadStoredActiveOrder(storeId: string): StoredActiveOrder | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveOrder;
    if (parsed.storeId === storeId && parsed.orderId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStoredActiveOrder(data: StoredActiveOrder) {
  localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredActiveOrder() {
  localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
}

const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

export function useActiveOrder() {
  const { activeOrderId, orderNumber, setActiveOrderId, setTrackingOrderId, setScreen, storeId } = useOrder();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!activeOrderId) {
      setOrder(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_order_public", { _order_id: activeOrderId });
    if (!error && data?.[0]) {
      const row = data[0] as PublicOrder;
      setOrder(row);
      if (TERMINAL_STATUSES.has(row.status)) {
        clearStoredActiveOrder();
        setActiveOrderId("");
      }
    } else {
      setOrder(null);
    }
    setLoading(false);
  }, [activeOrderId, setActiveOrderId]);

  useEffect(() => {
    if (!activeOrderId) {
      setOrder(null);
      return;
    }
    fetchOrder();

    const channel = supabase
      .channel(`active-order-${activeOrderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${activeOrderId}` },
        fetchOrder,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId, fetchOrder]);

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

  const hasActiveOrder =
    !!activeOrderId && !!order && !TERMINAL_STATUSES.has(order.status);

  return {
    order,
    loading,
    hasActiveOrder,
    displayNumber: order?.order_number || orderNumber,
    statusLabel: order ? getStatusLabel(order.status, order.order_type) : "",
    trackOrder,
    dismiss,
  };
}
