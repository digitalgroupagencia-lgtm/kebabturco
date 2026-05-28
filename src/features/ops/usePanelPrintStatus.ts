import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkBridgeStatus, fetchBridgeLastSeen, retryFailedPrintJobs } from "@/services/printerService";

export type PrintQueueSummary = {
  pending: number;
  failed: number;
  lastPrintedAt: string | null;
  bridge: "active" | "inactive" | "unknown";
  bridgeLastSeen: string | null;
  printerEnabled: boolean;
};

export function usePanelPrintStatus(storeId: string | undefined) {
  const [summary, setSummary] = useState<PrintQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    const [pendingRes, failedRes, lastRes, cfgRes, bridge, bridgeLastSeen] = await Promise.all([
      supabase
        .from("print_jobs")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "pending"),
      supabase
        .from("print_jobs")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "failed"),
      supabase
        .from("print_jobs")
        .select("updated_at")
        .eq("store_id", storeId)
        .eq("status", "printed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("printer_settings").select("enabled").eq("store_id", storeId).maybeSingle(),
      checkBridgeStatus(storeId),
      fetchBridgeLastSeen(storeId),
    ]);

    setSummary({
      pending: pendingRes.count ?? 0,
      failed: failedRes.count ?? 0,
      lastPrintedAt: lastRes.data?.updated_at ?? null,
      bridge,
      bridgeLastSeen,
      printerEnabled: !!cfgRes.data?.enabled,
    });
    setLoading(false);
  }, [storeId]);

  const retryFailed = useCallback(async () => {
    if (!storeId) return 0;
    const count = await retryFailedPrintJobs(storeId);
    await refresh();
    return count;
  }, [storeId, refresh]);

  useEffect(() => {
    void refresh();
    if (!storeId) return;
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [storeId, refresh]);

  return { summary, loading, refresh, retryFailed };
}
