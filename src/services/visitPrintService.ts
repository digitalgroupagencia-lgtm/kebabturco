import { supabase } from "@/integrations/supabase/client";
import { buildEscPosTicket, sampleOrder } from "@/services/escPosTicketBuilder";
import { checkoutPayloadToTicket, type CheckoutPrintInput } from "@/services/checkoutPrintHelper";

export type VisitPrintConfig = {
  user_id: string;
  printer_ip: string;
  printer_port: number;
  target_store_id: string | null;
  target_store_name?: string | null;
  restaurant_display_name: string;
  bridge_last_seen_at: string | null;
};

export const VISIT_LOCAL_HELPER_URL = "http://127.0.0.1:3847";
export const VISIT_LOCAL_BRIDGE_HEALTH_URL = "http://127.0.0.1:3848";

export type LocalMacStatus = {
  helper_online: boolean;
  bridge_running: boolean;
  bridge_direct: boolean;
};

export async function probeLocalMacPrint(): Promise<LocalMacStatus> {
  const out: LocalMacStatus = { helper_online: false, bridge_running: false, bridge_direct: false };
  try {
    const helperRes = await fetch(`${VISIT_LOCAL_HELPER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (helperRes.ok) {
      const body = (await helperRes.json()) as { bridge_running?: boolean };
      out.helper_online = true;
      out.bridge_running = Boolean(body.bridge_running);
    }
  } catch {
    /* helper offline */
  }
  try {
    const bridgeRes = await fetch(`${VISIT_LOCAL_BRIDGE_HEALTH_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (bridgeRes.ok) {
      const body = (await bridgeRes.json()) as { bridge?: boolean };
      out.bridge_direct = true;
      out.bridge_running = out.bridge_running || Boolean(body.bridge);
    }
  } catch {
    /* bridge not listening directly */
  }
  return out;
}

export async function startLocalMacPrintBridge(): Promise<{
  ok: boolean;
  already_running?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${VISIT_LOCAL_HELPER_URL}/start-bridge`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `Helper respondeu ${res.status}` };
    const body = (await res.json()) as { already_running?: boolean; started?: boolean };
    return { ok: true, already_running: body.already_running };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Helper local offline — corra «npm run visit-print:helper» no Mac uma vez.",
    };
  }
}

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
    restaurant_display_name: String(row.restaurant_display_name ?? ""),
    bridge_last_seen_at: row.bridge_last_seen_at ? String(row.bridge_last_seen_at) : null,
  };
}

export async function saveVisitPrintConfig(opts: {
  printerIp: string;
  printerPort: number;
  targetStoreId: string | null;
  restaurantDisplayName: string;
}) {
  const { error } = await supabase.rpc("save_master_visit_print_config", {
    _printer_ip: opts.printerIp,
    _printer_port: opts.printerPort,
    _target_store_id: opts.targetStoreId,
    _restaurant_display_name: opts.restaurantDisplayName,
  });
  if (error) throw error;
}

export async function resolveVisitDemoCompanyName(cfg?: VisitPrintConfig | null): Promise<string> {
  const c = cfg ?? (await fetchVisitPrintConfig());
  const manual = c?.restaurant_display_name?.trim();
  if (manual) return manual;
  if (c?.target_store_name?.trim()) return c.target_store_name.trim();
  return "Restaurante Demo";
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

/** Ticket fixo de demonstração — só muda o nome do restaurante. */
export async function printVisitDemoTest() {
  const cfg = await fetchVisitPrintConfig();
  if (!cfg?.printer_ip?.trim()) throw new Error("Configure o IP da impressora de visita");
  const storeId = cfg.target_store_id;
  if (!storeId) throw new Error("Escolha a unidade de referência para a fila de impressão");
  const companyName = await resolveVisitDemoCompanyName(cfg);
  const ticket = buildEscPosTicket(sampleOrder(companyName));
  return enqueueVisitDemoPrint(storeId, ticket);
}

export async function printVisitDemoOrder(input: CheckoutPrintInput) {
  const companyName = await resolveVisitDemoCompanyName();
  const ticket = checkoutPayloadToTicket({ ...input, companyName });
  const data = buildEscPosTicket(ticket);
  return enqueueVisitDemoPrint(input.storeId, data, input.orderId);
}

export function isVisitBridgeOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export const DEMO_VISIT_COUPON_CODE = "DEMO-IMPRESSAO";

export const VISIT_BRIDGE_INSTALL = `# Uma vez no Mac (deixe esta janela aberta nas visitas):
npm run visit-print:helper

# O painel «Ligar Mac» inicia a impressão automaticamente.
# Se preferir manual: npm run visit-print`;

export const VISIT_HELPER_ONLY = "npm run visit-print:helper";
