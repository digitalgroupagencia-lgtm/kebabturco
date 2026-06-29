// Printer Service, fila de impressão via Supabase + Print Bridge local.
import { supabase } from "@/integrations/supabase/client";
import { processAndroidDirectPrintJob } from "@/services/androidPrintListener";
import { buildEscPosTicket, buildTestTicket, sampleOrder, TicketOrder } from "@/services/escPosTicketBuilder";

export type PrintMode = "bridge" | "android_direct";

export interface PrinterConfig {
  printer_name: string;
  ip_address: string;
  port: number;
  printer_copies: number;
  enabled: boolean;
  print_mode: PrintMode;
}

export const defaultConfig: PrinterConfig = {
  printer_name: "Cocina",
  ip_address: "192.168.1.200",
  port: 9100,
  printer_copies: 1,
  enabled: false,
  print_mode: "bridge",
};

const BRIDGE_ONLINE_SECONDS = 90;

export async function fetchPrinterConfig(storeId: string): Promise<PrinterConfig> {
  const { data } = await supabase
    .from("printer_settings")
    .select("printer_name, ip_address, port, printer_copies, enabled, print_mode")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return defaultConfig;
  const raw = data as typeof data & { print_mode?: string | null };
  const mode: PrintMode = raw.print_mode === "android_direct" ? "android_direct" : "bridge";
  return {
    printer_name: data.printer_name || defaultConfig.printer_name,
    ip_address: data.ip_address || defaultConfig.ip_address,
    port: data.port || defaultConfig.port,
    printer_copies: data.printer_copies || 1,
    enabled: !!data.enabled,
    print_mode: mode,
  };
}

export async function savePrinterConfig(storeId: string, cfg: Partial<PrinterConfig>) {
  const { data: existing } = await supabase
    .from("printer_settings").select("id").eq("store_id", storeId).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("printer_settings").insert({
      store_id: storeId,
      printer_name: cfg.printer_name ?? defaultConfig.printer_name,
      ip_address: cfg.ip_address ?? defaultConfig.ip_address,
      port: cfg.port ?? defaultConfig.port,
      printer_copies: cfg.printer_copies ?? 1,
      enabled: cfg.enabled ?? false,
      print_mode: cfg.print_mode ?? defaultConfig.print_mode,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("printer_settings").update(cfg).eq("store_id", storeId);
    if (error) throw error;
  }
}


export async function createPrintJob(
  storeId: string,
  ticketDataBase64: string,
  orderId?: string,
  copiesOverride?: number,
  forceReprint = false,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("enqueue_print_job", {
    _ticket_data: ticketDataBase64,
    _store_id: storeId,
    _order_id: orderId ?? null,
    _copies_override: copiesOverride ?? null,
    _force_reprint: forceReprint,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, jobId: data as string };
}

export async function printOrder(
  storeId: string,
  order: TicketOrder,
  orderId?: string,
  options?: { forceReprint?: boolean },
) {
  const data = buildEscPosTicket(order);
  const copies = order.order_type === "delivery" ? 2 : undefined;
  const result = await createPrintJob(storeId, data, orderId, copies, options?.forceReprint ?? false);
  if (result.success && result.jobId) {
    void processAndroidDirectPrintJob(result.jobId);
  }
  return result;
}

export async function printTestTicket(storeId: string) {
  const cfg = await fetchPrinterConfig(storeId);
  const data = buildTestTicket(cfg.printer_name, cfg.ip_address, cfg.port);
  return createPrintJob(storeId, data);
}

export async function printSampleOrder(storeId: string, companyName: string) {
  const data = buildEscPosTicket(sampleOrder(companyName));
  return createPrintJob(storeId, data);
}

export async function hasActivePrintJob(orderId: string): Promise<boolean> {
  const { data } = await supabase
    .from("print_jobs")
    .select("id")
    .eq("order_id", orderId)
    .in("status", ["pending", "printing"])
    .limit(1);
  return !!(data && data.length > 0);
}

export async function retryFailedPrintJobs(storeId: string): Promise<number> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)("retry_failed_print_jobs", { _store_id: storeId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function checkBridgeStatus(storeId: string): Promise<"active" | "inactive" | "unknown"> {
  const cutoff = new Date(Date.now() - BRIDGE_ONLINE_SECONDS * 1000).toISOString();
  const { data: heartbeat } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { last_seen_at?: string } | null }> } } } })
    .from("print_bridge_heartbeats")
    .select("last_seen_at")
    .eq("store_id", storeId)
    .maybeSingle();

  if (heartbeat?.last_seen_at && heartbeat.last_seen_at >= cutoff) {
    return "active";
  }

  if (heartbeat?.last_seen_at) {
    return "inactive";
  }

  // Fallback heurístico enquanto bridge antigo não envia heartbeat
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("print_jobs")
    .select("id, status")
    .eq("store_id", storeId)
    .gte("updated_at", fiveMinAgo)
    .in("status", ["printed", "printing"])
    .limit(1);
  if (data && data.length > 0) return "active";

  const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString();
  const { data: pending } = await supabase
    .from("print_jobs")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .lte("created_at", thirtySecAgo)
    .limit(1);
  if (pending && pending.length > 0) return "inactive";
  return "unknown";
}

export async function fetchBridgeLastSeen(storeId: string): Promise<string | null> {
  const { data } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { last_seen_at?: string } | null }> } } } })
    .from("print_bridge_heartbeats")
    .select("last_seen_at")
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.last_seen_at ?? null;
}
