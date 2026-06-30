import { supabase } from "@/integrations/supabase/client";
import { buildEscPosTicket, sampleOrder } from "@/services/escPosTicketBuilder";
import { checkoutPayloadToTicket, type CheckoutPrintInput } from "@/services/checkoutPrintHelper";

export type VisitPrintConfig = {
  user_id: string;
  printer_ip: string;
  printer_port: number;
  restaurant_display_name: string;
  bridge_last_seen_at: string | null;
};

export const VISIT_LOCAL_HELPER_URL = "http://127.0.0.1:3847";
export const VISIT_LOCAL_BRIDGE_HEALTH_URL = "http://127.0.0.1:3848";
export const VISIT_LOCAL_BRIDGE_URL = "http://127.0.0.1:3848";

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
  bridge_running?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${VISIT_LOCAL_HELPER_URL}/start-bridge`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { ok: false, error: `Helper respondeu ${res.status}` };
    const body = (await res.json()) as {
      already_running?: boolean;
      started?: boolean;
      bridge_running?: boolean;
      error?: string;
      message?: string;
    };
    if (body.error === "missing_env") {
      return {
        ok: false,
        error: body.message || "Configure o Mac com npm run visit-print:setup",
      };
    }
    if (body.bridge_running) {
      return { ok: true, already_running: body.already_running, bridge_running: true };
    }
    const confirmed = await waitForLocalBridge(10000);
    return {
      ok: confirmed,
      already_running: body.already_running,
      bridge_running: confirmed,
      error: confirmed ? undefined : "Bridge não respondeu — corra npm run visit-print:setup no Mac",
    };
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

/** Aguarda o bridge local ficar online (após Ligar Mac). */
export async function waitForLocalBridge(maxMs = 10000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const status = await probeLocalMacPrint();
    if (status.bridge_running) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
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
    restaurant_display_name: String(row.restaurant_display_name ?? ""),
    bridge_last_seen_at: row.bridge_last_seen_at ? String(row.bridge_last_seen_at) : null,
  };
}

export async function saveVisitPrintConfig(opts: {
  printerIp: string;
  printerPort: number;
  restaurantDisplayName: string;
}) {
  const { error } = await supabase.rpc("save_master_visit_print_config", {
    _printer_ip: opts.printerIp,
    _printer_port: opts.printerPort,
    _target_store_id: undefined,
    _restaurant_display_name: opts.restaurantDisplayName,
  });
  if (error) throw error;
}

export async function resolveVisitDemoCompanyName(cfg?: VisitPrintConfig | null): Promise<string> {
  const c = cfg ?? (await fetchVisitPrintConfig());
  const manual = c?.restaurant_display_name?.trim();
  if (manual) return manual;
  return "Restaurante Demo";
}

export async function enqueueVisitDemoPrint(
  ticketBase64: string,
  orderId?: string,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("enqueue_visit_demo_print", {
    _ticket_data: ticketBase64,
    _store_id: undefined,
    _order_id: orderId ?? undefined,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, jobId: data as string };
}

export async function finalizeDemoVisitOrder(orderId: string) {
  const { data, error } = await supabase.rpc("finalize_demo_visit_order", { _order_id: orderId });
  if (error) throw error;
  return data as { success: boolean; demo_visit?: boolean };
}

/** Impressão directa no Mac (sem passar pelo servidor) — demo visita no mesmo computador. */
export async function printVisitDemoDirectLocal(opts: {
  printerIp: string;
  printerPort: number;
  ticketBase64: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${VISIT_LOCAL_BRIDGE_URL}/print-direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        printer_ip: opts.printerIp,
        printer_port: opts.printerPort || 9100,
        ticket_data: opts.ticketBase64,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error || `Mac respondeu ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Mac offline — abra «Demo visita» no computador",
    };
  }
}

/** Ticket fixo de demonstração — só muda o nome do restaurante. */
export async function printVisitDemoTest(): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
  direct?: boolean;
}> {
  const cfg = await fetchVisitPrintConfig();
  if (!cfg?.printer_ip?.trim()) throw new Error("Configure o IP da impressora de visita");
  if (!cfg.restaurant_display_name?.trim()) {
    throw new Error("Escreva o nome do restaurante que está a visitar");
  }
  const companyName = await resolveVisitDemoCompanyName(cfg);
  const ticket = buildEscPosTicket(sampleOrder(companyName));

  const local = await probeLocalMacPrint();
  if (local.bridge_running) {
    const direct = await printVisitDemoDirectLocal({
      printerIp: cfg.printer_ip.trim(),
      printerPort: cfg.printer_port || 9100,
      ticketBase64: ticket,
    });
    if (direct.ok) return { success: true, direct: true };
    if (direct.error?.includes("404")) {
      /* bridge antigo sem /print-direct — cair para fila */
    } else if (direct.error) {
      return { success: false, error: formatVisitPrintError(direct.error) };
    }
  }

  return enqueueVisitDemoPrint(ticket);
}

export async function printVisitDemoOrder(input: CheckoutPrintInput) {
  const cfg = await fetchVisitPrintConfig();
  const companyName = await resolveVisitDemoCompanyName(cfg);
  const ticket = checkoutPayloadToTicket({ ...input, companyName });
  const data = buildEscPosTicket(ticket);

  const local = await probeLocalMacPrint();
  if (local.bridge_running && cfg?.printer_ip?.trim()) {
    const direct = await printVisitDemoDirectLocal({
      printerIp: cfg.printer_ip.trim(),
      printerPort: cfg.printer_port || 9100,
      ticketBase64: data,
    });
    if (direct.ok) return { success: true, direct: true };
    if (!direct.error?.includes("404")) {
      return { success: false, error: formatVisitPrintError(direct.error || "Falha na impressão local") };
    }
  }

  return enqueueVisitDemoPrint(data, input.orderId);
}

export function isVisitBridgeOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export function formatVisitPrintError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("ehostdown") || m.includes("host is down")) {
    return "A impressora não responde nesse endereço. Por cabo ou Wi‑Fi, imprima de novo o ticket de rede na Epson — o IP pode ter mudado — e actualize no painel.";
  }
  if (m.includes("timeout tcp") || m.includes("timeout") || m.includes("timed out")) {
    return "O Mac não conseguiu falar com a impressora nesse endereço. Verifique se está ligada e se o IP está correcto (imprima o ticket de rede da Epson).";
  }
  if (m.includes("econnrefused")) {
    return "A impressora recusou a ligação — confirme o IP e a porta 9100.";
  }
  if (m.includes("token") && m.includes("inválido")) {
    return "A palavra-passe secreta no Mac não coincide com a do Lovable. Corra npm run visit-print:setup e faça Publish.";
  }
  return message;
}

export const VISIT_BRIDGE_INSTALL = `# Uma vez no Mac (deixe esta janela aberta nas visitas):
npm run visit-print:helper

# O painel «Ligar Mac» inicia a impressão automaticamente.
# Não precisa configurar impressora na loja oficial do projeto.`;

export const VISIT_HELPER_ONLY = "npm run visit-print:helper";
