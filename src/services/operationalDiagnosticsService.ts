import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;

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
  stripeSecretKeyTest?: boolean;
  stripeWebhookSecret: boolean;
  stripeWebhookSecretTest?: boolean;
  platform?: {
    keyMode: "live" | "test";
    connectLiveAllowed: boolean;
    platformProfileComplete: boolean;
    pendingVerification: boolean;
    productionBlocked: boolean;
    testKeysConfigured: boolean;
    adminMessage: string | null;
  } | null;
  webhookConfigured: boolean;
  webhookUrl: string | null;
  webhookExpectedUrl: string;
  webhookEvents: string[];
  edgeFunctions: Record<string, boolean>;
  store: {
    stripe_connect_account_id: string | null;
    stripe_connect_environment?: "live" | "test" | null;
    stripe_connect_test_simulated?: boolean;
    stripe_charges_enabled: boolean;
    stripe_onboarding_completed: boolean;
    stripe_payouts_enabled: boolean;
  } | null;
  webhookConfiguredTest?: boolean;
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
  schema_stripe_connect_environment: boolean;
  schema_stripe_connect_test_simulated: boolean;
}> {
  let schema_qr_token = true;
  let schema_kitchen_print = true;
  let schema_stripe_connect_environment = true;
  let schema_stripe_connect_test_simulated = true;

  const { error: qrErr } = await supabase.from("tables").select("qr_token").limit(1);
  if (qrErr?.message?.includes("qr_token")) schema_qr_token = false;

  const { error: printErr } = await supabase.from("orders").select("kitchen_printed_at").limit(1);
  if (printErr?.message?.includes("kitchen_printed_at")) schema_kitchen_print = false;

  const { error: envErr } = await supabase.from("stores").select("stripe_connect_environment").limit(1);
  if (envErr?.message?.includes("stripe_connect_environment")) schema_stripe_connect_environment = false;

  const { error: simErr } = await supabase.from("stores").select("stripe_connect_test_simulated").limit(1);
  if (simErr?.message?.includes("stripe_connect_test_simulated")) schema_stripe_connect_test_simulated = false;

  return {
    schema_qr_token,
    schema_kitchen_print,
    schema_stripe_connect_environment,
    schema_stripe_connect_test_simulated,
  };
}

export async function fetchServerOperationalDiagnostics(storeId: string | null): Promise<ServerDiagnostics | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.functions.invoke("operational-diagnostics", {
      body: { storeId },
    });
    if (error || (data && typeof data === "object" && "error" in data && data.error)) return null;
    return data as ServerDiagnostics;
  } catch {
    return null;
  }
}

