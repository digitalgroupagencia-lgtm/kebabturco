import { supabase as _supabaseRaw } from "@/integrations/supabase/client";

const supabase = _supabaseRaw as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
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
  if (error) throw new Error(error.message);
  return data as { session_id: string; table_number: string; table_id: string };
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
