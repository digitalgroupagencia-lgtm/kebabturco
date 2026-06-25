import { supabase } from "@/integrations/supabase/client";
import {
  checkBridgeStatus,
  fetchBridgeLastSeen,
  fetchPrinterConfig,
  printSampleOrder,
  printTestTicket,
} from "@/services/printerService";
import { printerDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";

export type PrintJobSummary = {
  id: string;
  status: string;
  created_at: string;
  error_message: string | null;
};

export type PrinterDiagnosticsSnapshot = {
  configEnabled: boolean;
  printerName: string;
  ipAddress: string;
  port: number;
  bridgeStatus: "active" | "inactive" | "unknown";
  bridgeLastSeen: string | null;
  jobCounts: Record<string, number>;
  recentJobs: PrintJobSummary[];
  lastJob: PrintJobSummary | null;
};

function log(stage: string, level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) {
  printerDiagnosticLogger.log({ stage, level, message, context: "printer", details });
}

export async function probePrinterDiagnostics(storeId: string): Promise<PrinterDiagnosticsSnapshot | null> {
  if (!storeId) return null;

  log("probe", "info", "A verificar impressora e fila", { storeId });

  const [cfg, bridgeStatus, bridgeLastSeen] = await Promise.all([
    fetchPrinterConfig(storeId),
    checkBridgeStatus(storeId),
    fetchBridgeLastSeen(storeId),
  ]);

  const statuses = ["pending", "printing", "printed", "failed"] as const;
  const jobCounts: Record<string, number> = {};
  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from("print_jobs")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", status);
      jobCounts[status] = count ?? 0;
    }),
  );

  const { data: recentJobs } = await supabase
    .from("print_jobs")
    .select("id, status, created_at, error_message")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(8);

  const snapshot: PrinterDiagnosticsSnapshot = {
    configEnabled: cfg.enabled,
    printerName: cfg.printer_name,
    ipAddress: cfg.ip_address,
    port: cfg.port,
    bridgeStatus,
    bridgeLastSeen,
    jobCounts,
    recentJobs: (recentJobs ?? []) as PrintJobSummary[],
    lastJob: recentJobs?.[0] ? (recentJobs[0] as PrintJobSummary) : null,
  };

  log("probe", bridgeStatus === "active" ? "info" : "warn", `Bridge: ${bridgeStatus}`, {
    enabled: cfg.enabled,
    pending: jobCounts.pending,
    failed: jobCounts.failed,
  });

  return snapshot;
}

export async function runGuidedPrintTest(
  storeId: string,
  type: "basic" | "sample",
  companyName: string,
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  log("test_send", "info", type === "basic" ? "A enviar ticket de teste" : "A enviar pedido exemplo", { type });

  const result =
    type === "basic" ? await printTestTicket(storeId) : await printSampleOrder(storeId, companyName);

  if (!result.success || !result.jobId) {
    log("test_send", "error", result.error ?? "Falha ao criar job de impressão", { result });
    return { ok: false, error: result.error ?? "Falha ao criar job" };
  }

  log("test_send", "info", "Job criado, a aguardar impressão", { jobId: result.jobId });

  const finalStatus = await pollPrintJobStatus(result.jobId, 45000);
  if (finalStatus === "printed") {
    log("test_send", "info", "Ticket impresso com sucesso", { jobId: result.jobId });
    return { ok: true, jobId: result.jobId };
  }
  if (finalStatus === "failed") {
    log("test_send", "error", "Job falhou na impressão", { jobId: result.jobId });
    return { ok: false, jobId: result.jobId, error: "Impressão falhou, veja fila e bridge" };
  }

  log("test_send", "warn", "Timeout, job ainda pendente (bridge offline?)", {
    jobId: result.jobId,
    status: finalStatus,
  });
  return { ok: false, jobId: result.jobId, error: "Timeout, verifique se o PC da cozinha está ligado" };
}

async function pollPrintJobStatus(jobId: string, timeoutMs: number): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase.from("print_jobs").select("status, error_message").eq("id", jobId).maybeSingle();
    if (!data) return null;
    if (data.status === "printed" || data.status === "failed") {
      if (data.error_message) {
        log("poll", "error", data.error_message, { jobId, status: data.status });
      }
      return data.status;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  const { data } = await supabase.from("print_jobs").select("status").eq("id", jobId).maybeSingle();
  return data?.status ?? "pending";
}
