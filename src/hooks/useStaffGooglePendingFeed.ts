import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listStaffGooglePending, type StaffGooglePendingMember } from "@/services/staffGoogleLogin";

type Options = {
  storeId: string | null | undefined;
  enabled?: boolean;
  pollMs?: number;
};

/** Lista pedidos Google da equipa com atualização automática (realtime + polling). */
export function useStaffGooglePendingFeed({
  storeId,
  enabled = true,
  pollMs = 8000,
}: Options) {
  const [rows, setRows] = useState<StaffGooglePendingMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !storeId) {
      setRows([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const pending = await listStaffGooglePending(storeId);
      setRows(pending);
      setError(null);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Não foi possível carregar pedidos Google");
    } finally {
      setLoading(false);
    }
  }, [enabled, storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !storeId) return;

    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(timer);
  }, [enabled, storeId, pollMs, refresh]);

  useEffect(() => {
    if (!enabled || !storeId) return;

    const channel = supabase
      .channel(`staff-google-pending:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_google_pending",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, storeId, refresh]);

  return { rows, loading, error, refresh };
}
