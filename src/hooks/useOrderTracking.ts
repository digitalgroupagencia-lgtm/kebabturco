import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicOrderTrack = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  estimated_ready_at: string | null;
  delivery_street: string | null;
  delivery_city: string | null;
};

const POLL_MS = 3000;

/** Acompanhamento público: polling + broadcast (após SQL fase 8). */
export function useOrderTracking(
  orderId: string | null | undefined,
  onOrder: (order: PublicOrderTrack | null) => void,
  onLoading?: (loading: boolean) => void,
) {
  const onOrderRef = useRef(onOrder);
  onOrderRef.current = onOrder;

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      onOrderRef.current(null);
      onLoading?.(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_order_public", { _order_id: orderId });
    if (!error && data?.[0]) {
      onOrderRef.current(data[0] as PublicOrderTrack);
    } else {
      onOrderRef.current(null);
    }
    onLoading?.(false);
  }, [orderId, onLoading]);

  useEffect(() => {
    if (!orderId) {
      onLoading?.(false);
      return;
    }

    onLoading?.(true);
    fetchOrder();

    const poll = window.setInterval(fetchOrder, POLL_MS);

    const channel = supabase
      .channel(`order:${orderId}`, { config: { broadcast: { ack: false, self: false } } })
      .on("broadcast", { event: "status_update" }, () => {
        void fetchOrder();
      })
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchOrder, onLoading]);
}
