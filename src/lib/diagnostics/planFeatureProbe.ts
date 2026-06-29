import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import {
  FEATURE_MIN_PLAN,
  isFeatureAvailableForPlan,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import type { PlanKey, TenantFeatureFlag } from "@/lib/platformFeatures";
import { planDiagnosticLogger } from "@/lib/diagnostics/diagnosticLoggers";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";

export type PlanFeatureProbeRow = {
  featureKey: string;
  label: string;
  minPlan: PlanKey;
  availableOnPlan: boolean;
  enabledForTenant: boolean;
  probeStatus: "ok" | "warn" | "fail" | "skip";
  probeDetail: string;
};

const FEATURE_LABELS: Record<string, string> = {
  push_notifications: "Push",
  loyalty: "Fidelidade",
  campaigns: "Campanhas",
  coupons: "Cupões",
  pwa_install: "App instalável",
  ai_support: "IA atendimento",
  customer_recovery: "Recuperação clientes",
};

function log(stage: string, level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) {
  planDiagnosticLogger.log({ stage, level, message, context: "plan", details });
}

async function probeFeatureMetric(
  featureKey: string,
  storeId: string | null,
): Promise<{ status: "ok" | "warn" | "fail" | "skip"; detail: string }> {
  if (!storeId) return { status: "skip", detail: "Sem loja seleccionada" };

  switch (featureKey) {
    case "push_notifications": {
      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("customer_phone", CUSTOMER_MARKETING_PUSH_TAG);
      const n = count ?? 0;
      return n > 0
        ? { status: "ok", detail: `${n} subscritor(es) marketing` }
        : { status: "warn", detail: "0 subscritores marketing — normal até clientes aceitarem" };
    }
    case "loyalty": {
      const { count } = await supabase
        .from("loyalty_accounts")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      return { status: "ok", detail: `${count ?? 0} conta(s) de fidelidade` };
    }
    case "campaigns": {
      const { count } = await supabase
        .from("marketing_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_active", true);
      return { status: (count ?? 0) > 0 ? "ok" : "warn", detail: `${count ?? 0} campanha(s) activa(s)` };
    }
    default:
      return { status: "skip", detail: "Verificação manual" };
  }
}

export async function runPlanFeatureProbe(storeId: string | null): Promise<{
  tenantPlan: PlanKey;
  rows: PlanFeatureProbeRow[];
}> {
  log("probe", "info", "A verificar plano e funcionalidades");

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, plan")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .maybeSingle();

  if (error || !tenant) {
    log("probe", "error", error?.message ?? "Tenant não encontrado");
    return { tenantPlan: "start", rows: [] };
  }

  const tenantPlan = normalizePlan(tenant.plan);
  const { data: flags } = await supabase.rpc("get_tenant_feature_flags", {
    _tenant_id: tenant.id,
  });
  const flagList = (flags ?? []) as TenantFeatureFlag[];

  const keys = Object.keys(FEATURE_MIN_PLAN).filter((k) =>
    ["push_notifications", "loyalty", "campaigns", "pwa_install", "ai_support", "customer_recovery"].includes(k),
  );

  const rows: PlanFeatureProbeRow[] = [];
  for (const featureKey of keys) {
    const minPlan = FEATURE_MIN_PLAN[featureKey] ?? "premium";
    const availableOnPlan = isFeatureAvailableForPlan(featureKey, tenantPlan);
    const flag = flagList.find((f) => f.feature_key === featureKey);
    const enabledForTenant = flag?.enabled ?? false;
    const probe = availableOnPlan && enabledForTenant ? await probeFeatureMetric(featureKey, storeId) : { status: "skip" as const, detail: availableOnPlan ? "Funcionalidade desactivada" : `Requer plano ${minPlan.toUpperCase()}` };

    rows.push({
      featureKey,
      label: FEATURE_LABELS[featureKey] ?? featureKey,
      minPlan,
      availableOnPlan,
      enabledForTenant,
      probeStatus: probe.status,
      probeDetail: probe.detail,
    });

    log(
      "feature",
      enabledForTenant && availableOnPlan ? "info" : "warn",
      `${FEATURE_LABELS[featureKey] ?? featureKey}: ${probe.detail}`,
      { featureKey, enabledForTenant, availableOnPlan },
    );
  }

  return { tenantPlan, rows };
}
