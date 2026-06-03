import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkBridgeStatus, fetchBridgeLastSeen, retryFailedPrintJobs } from "@/services/printerService";

export type PrintJobInfo = {
  id: string;
  order_id: string | null;
  order_number?: string | null;
  updated_at: string;
  created_at?: string;
  error_message?: string | null;
};

export type PrintQueueSummary = {
  pending: number;
  failed: number;
  printing: number;
  lastPrintedAt: string | null;
  lastPrintedJob: PrintJobInfo | null;
  lastFailedJob: PrintJobInfo | null;
  oldestPendingJob: PrintJobInfo | null;
  bridge: "active" | "inactive" | "unknown";
  bridgeLastSeen: string | null;
  bridgeReason: string | null;
  printerEnabled: boolean;
};

function bridgeReason(
  bridge: "active" | "inactive" | "unknown",
  lastSeen: string | null,
  pendingCount: number,
  lastFailed: PrintJobInfo | null,
): string | null {
  if (bridge === "active") return null;
  if (bridge === "unknown") {
    return lastSeen
      ? "Bridge sem heartbeat recente — verifique se o serviço Print Bridge está aberto no PC da loja."
      : "Nenhum heartbeat do Print Bridge alguma vez registado. Instale e abra o Print Bridge no PC ligado à impressora.";
  }
  // inactive
  const parts: string[] = [];
  if (lastSeen) {
    const ago = Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000);
    parts.push(`Último sinal há ${ago}s.`);
  }
  if (pendingCount > 0) parts.push(`${pendingCount} job(s) parados na fila.`);
  if (lastFailed?.error_message) parts.push(`Último erro: ${lastFailed.error_message}`);
  else parts.push("Print Bridge parou de responder. Verifique o serviço no PC, a rede e a impressora.");
  return parts.join(" ");
}

export function usePanelPrintStatus(storeId: string | undefined) {
  const [summary, setSummary] = useState<PrintQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    const [pendingRes, failedRes, printingRes, lastPrintedRes, lastFailedRes, oldestPendingRes, cfgRes, bridge, bridgeLastSeen] =
      await Promise.all([
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "failed"),
        supabase.from("print_jobs").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "printing"),
        supabase
          .from("print_jobs")
          .select("id, order_id, updated_at, created_at, error_message")
          .eq("store_id", storeId)
          .eq("status", "printed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("print_jobs")
          .select("id, order_id, updated_at, created_at, error_message")
          .eq("store_id", storeId)
          .eq("status", "failed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("print_jobs")
          .select("id, order_id, updated_at, created_at, error_message")
          .eq("store_id", storeId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("printer_settings").select("enabled").eq("store_id", storeId).maybeSingle(),
        checkBridgeStatus(storeId),
        fetchBridgeLastSeen(storeId),
      ]);

    const pendingCount = pendingRes.count ?? 0;
    const lastFailedJob = (lastFailedRes.data ?? null) as PrintJobInfo | null;
    const lastPrintedJob = (lastPrintedRes.data ?? null) as PrintJobInfo | null;
    const oldestPendingJob = (oldestPendingRes.data ?? null) as PrintJobInfo | null;

    setSummary({
      pending: pendingCount,
      failed: failedRes.count ?? 0,
      printing: printingRes.count ?? 0,
      lastPrintedAt: lastPrintedJob?.updated_at ?? null,
      lastPrintedJob,
      lastFailedJob,
      oldestPendingJob,
      bridge,
      bridgeLastSeen,
      bridgeReason: bridgeReason(bridge, bridgeLastSeen, pendingCount, lastFailedJob),
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

  const clearJobs = useCallback(
    async (statuses: string[]) => {
      if (!storeId) return 0;
      const { data, error } = await supabase
        .from("print_jobs")
        .delete()
        .eq("store_id", storeId)
        .in("status", statuses as ("pending" | "failed" | "printed" | "printing")[])
        .select("id");
      if (error) throw error;
      await refresh();
      return data?.length ?? 0;
    },
    [storeId, refresh],
  );

  useEffect(() => {
    void refresh();
    if (!storeId) return;
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [storeId, refresh]);

  return { summary, loading, refresh, retryFailed, clearJobs };
}
