import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  acknowledgePendingOrderAlert,
  isStaffOrderAlertsActive,
  preparePanelAlertsIfEnabled,
  registerNewPendingOrderAlert,
  syncPendingOrderAlertLoop,
  tickPendingAlertUrgency,
} from "@/lib/panelAlerts";
import { orderReadyForKitchen, shouldShowOrderInRestaurantPanel } from "@/lib/orderKitchenRules";
import { restoreNativeStaffPushIfPossible } from "@/services/nativePush";
import { endStaffOrderLiveActivity, startStaffOrderLiveActivity } from "@/services/staffLiveActivity";

const POLL_MS = 8_000;

type PendingOrderRow = {
  id: string;
  order_number: number | string | null;
  status: string | null;
  payment_status: string | null;
  order_type: string | null;
  table_validated: boolean | null;
  is_test: boolean | null;
  coupon_code: string | null;
};

/**
 * Mantém o som de novos pedidos em qualquer página do painel/admin com login,
 * até alguém mudar o estado do pedido (não só em /panel/live).
 */
export function useStaffPendingOrderAlerts(storeId: string | null | undefined) {
  const knownPendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId) return;

    void preparePanelAlertsIfEnabled(storeId);
    void restoreNativeStaffPushIfPossible(storeId);

    const syncPending = async () => {
      if (!isStaffOrderAlertsActive()) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, payment_status, order_type, table_validated, is_test, coupon_code",
        )
        .eq("store_id", storeId)
        .eq("status", "pending")
        .gte("created_at", today.toISOString());

      const rows = ((data ?? []) as PendingOrderRow[]).filter(
        (order) => shouldShowOrderInRestaurantPanel(order) && orderReadyForKitchen(order),
      );
      const pendingIds = new Set(rows.map((order) => order.id));

      for (const order of rows) {
        if (!knownPendingRef.current.has(order.id)) {
          knownPendingRef.current.add(order.id);
          registerNewPendingOrderAlert(order.id);
          void startStaffOrderLiveActivity(order.id, String(order.order_number ?? "?"));
        }
      }

      for (const id of Array.from(knownPendingRef.current)) {
        if (!pendingIds.has(id)) {
          knownPendingRef.current.delete(id);
          acknowledgePendingOrderAlert(id);
          void endStaffOrderLiveActivity(id);
        }
      }

      syncPendingOrderAlertLoop(pendingIds.size > 0);
    };

    void syncPending();

    const pollId = window.setInterval(() => void syncPending(), POLL_MS);

    const channel = supabase
      .channel(`staff-pending-alerts-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        () => {
          void syncPending();
        },
      )
      .subscribe();

    const urgencyId = window.setInterval(() => tickPendingAlertUrgency(), 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncPending();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(urgencyId);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [storeId]);
}
