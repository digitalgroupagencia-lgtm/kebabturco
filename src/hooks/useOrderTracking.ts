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

const POLL_MS = 1_000;
const POLL_BACKUP_MS = 3_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 20_000;

/** Acompanhamento público: broadcast (fase 8 SQL) + polling de reserva. */
export function useOrderTracking(
  orderId: string | null | undefined,
  onOrder: (order: PublicOrderTrack | null) => void,
  onLoading?: (loading: boolean) => void,
) {
  const onOrderRef = useRef(onOrder);
  onOrderRef.current = onOrder;
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollIdRef = useRef<number | null>(null);

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
    void fetchOrder();

    const startPoll = (ms: number) => {
      if (pollIdRef.current) window.clearInterval(pollIdRef.current);
      pollIdRef.current = window.setInterval(() => void fetchOrder(), ms);
    };
    startPoll(POLL_MS);

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const subscribe = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`order:${orderId}:${Date.now()}`, { config: { broadcast: { ack: false, self: false } } })
        .on("broadcast", { event: "status_update" }, () => {
          reconnectAttemptRef.current = 0;
          startPoll(POLL_MS);
          void fetchOrder();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            reconnectAttemptRef.current = 0;
            startPoll(POLL_MS);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            startPoll(POLL_BACKUP_MS);
            clearReconnect();
            reconnectAttemptRef.current += 1;
            const delay = Math.min(
              RECONNECT_BASE_MS * 2 ** (reconnectAttemptRef.current - 1),
              RECONNECT_MAX_MS,
            );
            reconnectTimerRef.current = window.setTimeout(subscribe, delay);
          }
        });

      channelRef.current = channel;
    };

    subscribe();

    return () => {
      if (pollIdRef.current) window.clearInterval(pollIdRef.current);
      clearReconnect();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [orderId, fetchOrder, onLoading]);
}
