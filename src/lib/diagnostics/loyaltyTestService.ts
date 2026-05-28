import { supabase } from "@/integrations/supabase/client";
import { loyaltyDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";

const STAMPS_NEEDED = 10;
export const LOYALTY_DIAG_PHONE = "__diag_test__";

function log(stage: string, level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) {
  loyaltyDiagnosticLogger.log({ stage, level, message, context: "loyalty", details });
}

export type LoyaltyDiagnosticsSnapshot = {
  accountCount: number;
  readyRewards: number;
  activeCampaigns: number;
  topAccounts: Array<{ phone: string; stamps: number; total_orders: number }>;
};

export async function probeLoyaltyDiagnostics(storeId: string): Promise<LoyaltyDiagnosticsSnapshot> {
  const [{ data: accounts }, { count: campaignCount }] = await Promise.all([
    supabase
      .from("loyalty_accounts")
      .select("phone, stamps, total_orders")
      .eq("store_id", storeId)
      .order("stamps", { ascending: false })
      .limit(10),
    supabase
      .from("marketing_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_active", true),
  ]);

  const rows = accounts ?? [];
  const readyRewards = rows.filter((a) => (a.stamps ?? 0) >= STAMPS_NEEDED).length;

  log("probe", "info", `${rows.length} contas (amostra), ${readyRewards} prémios prontos`, {
    campaigns: campaignCount ?? 0,
  });

  return {
    accountCount: rows.length,
    readyRewards,
    activeCampaigns: campaignCount ?? 0,
    topAccounts: rows.map((r) => ({
      phone: r.phone,
      stamps: r.stamps ?? 0,
      total_orders: r.total_orders ?? 0,
    })),
  };
}

export async function simulateLoyaltyRule(phone: string, stamps: number) {
  const rewardReady = stamps >= STAMPS_NEEDED;
  const remaining = Math.max(0, STAMPS_NEEDED - stamps);
  log("simulate", "info", rewardReady ? "Prémio disponível (simulação)" : `Faltam ${remaining} carimbos`, {
    phone,
    stamps,
    stampsNeeded: STAMPS_NEEDED,
  });
  return { stamps, stampsNeeded: STAMPS_NEEDED, rewardReady, remaining };
}

export async function testLoyaltyStatus(storeId: string, phone: string) {
  log("status", "info", "A consultar estado de fidelidade", { phone });
  const { data, error } = await supabase.rpc("get_loyalty_status", {
    _store_id: storeId,
    _phone: phone.trim(),
  });
  if (error) {
    log("status", "error", error.message);
    throw error;
  }
  log("status", "info", "Estado obtido", data as Record<string, unknown>);
  return data as { stamps?: number; reward_ready?: boolean; total_orders?: number };
}

export async function addTestLoyaltyStamp(storeId: string, phone: string) {
  if (!phone.trim()) {
    log("stamp", "warn", "Telefone obrigatório");
    return { ok: false, error: "Indique um telefone" };
  }
  log("stamp", "info", "A adicionar carimbo de teste", { phone });
  const { data, error } = await supabase.rpc("add_loyalty_stamp", {
    _store_id: storeId,
    _phone: phone.trim(),
    _customer_id: null,
  });
  if (error) {
    log("stamp", "error", error.message);
    return { ok: false, error: error.message };
  }
  log("stamp", "info", "Carimbo adicionado", data as Record<string, unknown>);
  return { ok: true, data };
}
