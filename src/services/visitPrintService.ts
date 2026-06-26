import { supabase } from "@/integrations/supabase/client";
import { buildEscPosTicket, buildTestTicket } from "@/services/escPosTicketBuilder";
import { checkoutPayloadToTicket, type CheckoutPrintInput } from "@/services/checkoutPrintHelper";

export type VisitPrintConfig = {
  user_id: string;
  printer_ip: string;
  printer_port: number;
  target_store_id: string | null;
  target_store_name?: string | null;
  bridge_last_seen_at: string | null;
};

export async function fetchVisitPrintConfig(): Promise<VisitPrintConfig | null> {
  const { data, error } = await supabase.rpc("get_master_visit_print_config");
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    user_id: String(row.user_id ?? ""),
    printer_ip: String(row.printer_ip ?? ""),
    printer_port: Number(row.printer_port ?? 9100),
    target_store_id: row.target_store_id ? String(row.target_store_id) : null,
    target_store_name: row.target_store_name ? String(row.target_store_name) : null,
    bridge_last_seen_at: row.bridge_last_seen_at ? String(row.bridge_last_seen_at) : null,
  };
}

export async function saveVisitPrintConfig(opts: {
  printerIp: string;
  printerPort: number;
  targetStoreId: string | null;
}) {
  const { error } = await supabase.rpc("save_master_visit_print_config", {
    _printer_ip: opts.printerIp,
    _printer_port: opts.printerPort,
    _target_store_id: opts.targetStoreId,
  });
  if (error) throw error;
}

export async function enqueueVisitDemoPrint(
  storeId: string,
  ticketBase64: string,
  orderId?: string,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("enqueue_visit_demo_print", {
    _ticket_data: ticketBase64,
    _store_id: storeId,
    _order_id: orderId ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, jobId: data as string };
}

export async function finalizeDemoVisitOrder(orderId: string) {
  const { data, error } = await supabase.rpc("finalize_demo_visit_order", { _order_id: orderId });
  if (error) throw error;
  return data as { success: boolean; demo_visit?: boolean };
}

export async function printVisitDemoTest(companyName: string) {
  const cfg = await fetchVisitPrintConfig();
  if (!cfg?.printer_ip?.trim()) throw new Error("Configure o IP da impressora de visita");
  const storeId = cfg.target_store_id;
  if (!storeId) throw new Error("Escolha a loja/unidade para o ticket de demonstração");
  const ticket = buildTestTicket("DEMO VISITA", cfg.printer_ip, cfg.printer_port);
  return enqueueVisitDemoPrint(storeId, ticket);
}

export async function printVisitDemoOrder(input: CheckoutPrintInput) {
  const ticket = checkoutPayloadToTicket(input);
  const data = buildEscPosTicket(ticket);
  return enqueueVisitDemoPrint(input.storeId, data, input.orderId);
}

export function isVisitBridgeOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export const DEMO_VISIT_COUPON_CODE = "DEMO-IMPRESSAO";

export const VISIT_BRIDGE_INSTALL = `cd print-bridge && npm install
cp visit-print-bridge.env.example ~/.kebab-visit-print.env
# Edite ~/.kebab-visit-print.env com SUPABASE_URL, SERVICE_ROLE e VISIT_OWNER_USER_ID
node ../scripts/visit-print-bridge.mjs`;
