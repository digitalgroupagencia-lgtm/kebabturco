import { supabase } from "@/integrations/supabase/client";

export type DbDiagnostics = {
  schema_qr_token: boolean;
  schema_kitchen_print: boolean;
  schema_table_validated: boolean;
  rpc_claim_kitchen_print: boolean;
  rpc_mark_paid_counter: boolean;
  rpc_regenerate_qr: boolean;
  rpc_get_diagnostics: boolean;
  active_tables: number;
  inactive_tables: number;
  tables_missing_qr_token: number;
};

export type ServerDiagnostics = {
  stripeSecretKey: boolean;
  stripeWebhookSecret: boolean;
  webhookConfigured: boolean;
  webhookUrl: string | null;
  webhookExpectedUrl: string;
  webhookEvents: string[];
  edgeFunctions: Record<string, boolean>;
  store: {
    stripe_connect_account_id: string | null;
    stripe_charges_enabled: boolean;
    stripe_onboarding_completed: boolean;
    stripe_payouts_enabled: boolean;
  } | null;
};

export async function fetchDbOperationalDiagnostics(storeId: string | null): Promise<DbDiagnostics | null> {
  const { data, error } = await supabase.rpc("get_operational_diagnostics", {
    _store_id: storeId ?? undefined,
  });
  if (error) return null;
  return data as DbDiagnostics;
}

/** Prova colunas quando a função de diagnóstico ainda não foi aplicada. */
export async function probeSchemaFallback(): Promise<{
  schema_qr_token: boolean;
  schema_kitchen_print: boolean;
}> {
  let schema_qr_token = true;
  let schema_kitchen_print = true;

  const { error: qrErr } = await supabase.from("tables").select("qr_token").limit(1);
  if (qrErr?.message?.includes("qr_token")) schema_qr_token = false;

  const { error: printErr } = await supabase.from("orders").select("kitchen_printed_at").limit(1);
  if (printErr?.message?.includes("kitchen_printed_at")) schema_kitchen_print = false;

  return { schema_qr_token, schema_kitchen_print };
}

export async function fetchServerOperationalDiagnostics(storeId: string | null): Promise<ServerDiagnostics | null> {
  const { data, error } = await supabase.functions.invoke("operational-diagnostics", {
    body: { storeId },
  });
  if (error || data?.error) return null;
  return data as ServerDiagnostics;
}
