import { supabase as _supabaseRaw } from "@/integrations/supabase/client";

const supabase = _supabaseRaw as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string | boolean) => {
        eq: (col: string, val: string | boolean) => {
          eq: (col: string, val: string | boolean) => {
            maybeSingle: () => Promise<{
              data: { id: string; number: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
};

export type PublicTableBinding = {
  active: boolean;
  reason?: string;
  table_number?: string;
  table_id?: string;
  session_id?: string;
  session_status?: string;
  payment_pending?: boolean;
  pending_payment_count?: number;
  active_order_count?: number;
};

export type ResolvedTableByQr = {
  table_id: string;
  table_number: string;
};

export async function resolveTableByNumber(
  storeId: string,
  tableNumber: string,
): Promise<ResolvedTableByQr | null> {
  const number = tableNumber.trim();
  if (!number) return null;

  const { data, error } = await supabase
    .from("tables")
    .select("id, number")
    .eq("store_id", storeId)
    .eq("number", number)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return { table_id: data.id, table_number: data.number };
}

export async function resolveTableByQrToken(
  storeId: string,
  qrToken: string,
): Promise<ResolvedTableByQr | null> {
  const token = qrToken.trim();
  if (!token) return null;

  try {
    const binding = await fetchPublicTableBinding(storeId, token, null);
    if (binding.table_id && binding.table_number) {
      return { table_id: binding.table_id, table_number: binding.table_number };
    }
    if (binding.reason === "invalid_token" || binding.reason === "missing_params") {
      return null;
    }
  } catch {
    /* RPC em falta ou rede — tenta leitura directa */
  }

  const { data, error } = await supabase
    .from("tables")
    .select("id, number")
    .eq("store_id", storeId)
    .eq("qr_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return { table_id: data.id, table_number: data.number };
}

export async function fetchPublicTableBinding(
  storeId: string,
  qrToken: string,
  knownSessionId?: string | null,
): Promise<PublicTableBinding> {
  const { data, error } = await supabase.rpc("get_public_table_binding", {
    _store_id: storeId,
    _qr_token: qrToken,
    _known_session_id: knownSessionId || null,
  });
  if (error) throw new Error(error.message);
  return (data || { active: false }) as PublicTableBinding;
}

export async function openTableSessionOnScan(storeId: string, qrToken: string) {
  const { data, error } = await supabase.rpc("open_table_session_on_scan_public", {
    _store_id: storeId,
    _qr_token: qrToken,
  });
  if (!error && data) {
    return data as { session_id: string; table_number: string; table_id: string };
  }

  const table = await resolveTableByQrToken(storeId, qrToken);
  if (!table) throw new Error(error?.message || "QR da mesa inválido ou inactivo");

  const legacy = await supabase.rpc("open_or_get_table_session_public", {
    _store_id: storeId,
    _table_number: table.table_number,
    _table_id: table.table_id,
  });
  if (legacy.error) throw new Error(legacy.error.message);

  return {
    session_id: String(legacy.data),
    table_number: table.table_number,
    table_id: table.table_id,
  };
}

export async function markTableSessionPaid(sessionId: string, paymentMethod = "cash") {
  const { data, error } = await supabase.rpc("mark_table_session_paid", {
    _session_id: sessionId,
    _payment_method: paymentMethod,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function closeTableByNumber(storeId: string, tableNumber: string, paymentMethod = "cash") {
  const { data, error } = await supabase.rpc("close_table_session_by_table_number", {
    _store_id: storeId,
    _table_number: tableNumber,
    _payment_method: paymentMethod,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function closeTableSessionUnified(sessionId: string, paymentMethod = "cash") {
  const { data, error } = await supabase.rpc("close_table_session_unified", {
    _session_id: sessionId,
    _payment_method: paymentMethod,
  });
  if (error) throw new Error(error.message);
  return data;
}

export type OpenTableSessionRow = {
  session_id: string;
  table_number: string;
  table_id: string | null;
  opened_at: string;
  total_amount: number;
  order_count: number;
  pending_payment_count: number;
  active_kitchen_count: number;
  pending_payment_total: number;
};

export async function listStoreOpenTableSessions(storeId: string): Promise<OpenTableSessionRow[]> {
  const { data, error } = await supabase.rpc("list_store_open_table_sessions", {
    _store_id: storeId,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as OpenTableSessionRow[]) : [];
}
