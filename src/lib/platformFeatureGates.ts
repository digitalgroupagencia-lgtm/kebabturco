import type { PlanKey } from "@/lib/platformFeatures";

const PLAN_RANK: Record<PlanKey, number> = { start: 1, pro: 2, premium: 3 };

/** Plano mínimo para desbloquear cada funcionalidade (fonte: seeds de planos). */
export const FEATURE_MIN_PLAN: Record<string, PlanKey> = {
  menu: "start",
  online_orders: "start",
  qr_tables: "start",
  delivery_basic: "start",
  custom_domain: "start",
  mobile_experience: "start",
  pwa_install: "pro",
  push_notifications: "pro",
  loyalty: "pro",
  campaigns: "pro",
  seller_app: "pro",
  delivery_advanced: "pro",
  analytics: "pro",
  customer_recovery: "pro",
  google_play: "premium",
  app_store: "premium",
  ai_support: "premium",
  ai_seller: "premium",
  ai_automations: "premium",
  multi_store: "premium",
  advanced_dashboards: "premium",
  conversational_ordering: "premium",
};

export const AI_MODULE_FEATURES: Record<string, string> = {
  support: "ai_support",
  seller: "ai_seller",
  recovery: "customer_recovery",
  marketing: "campaigns",
};

export const PLAN_DISPLAY: Record<PlanKey, string> = {
  start: "START",
  pro: "PRO",
  premium: "PREMIUM",
};

export function normalizePlan(plan: string | null | undefined): PlanKey {
  if (plan === "pro" || plan === "premium") return plan;
  return "start";
}

export function isPlanAtLeast(current: PlanKey, required: PlanKey): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export function getMinPlanForFeature(featureKey: string): PlanKey {
  return FEATURE_MIN_PLAN[featureKey] ?? "premium";
}

export function isFeatureAvailableForPlan(featureKey: string, tenantPlan: PlanKey): boolean {
  return isPlanAtLeast(tenantPlan, getMinPlanForFeature(featureKey));
}

/** Admin geral ignora limites de plano; restantes respeitam flags e plano do tenant. */
export function isTenantFeatureEnabled(
  featureKey: string,
  tenantPlan: PlanKey,
  options?: {
    platformAdmin?: boolean;
    featureFlags?: Array<{ feature_key: string; enabled: boolean }>;
  },
): boolean {
  if (options?.platformAdmin) return true;
  const flag = options?.featureFlags?.find((f) => f.feature_key === featureKey);
  if (flag?.enabled === false) return false;
  return isFeatureAvailableForPlan(featureKey, tenantPlan);
}

export function upgradeLabelForFeature(featureKey: string): string {
  const plan = getMinPlanForFeature(featureKey);
  return `Disponível no ${PLAN_DISPLAY[plan]}`;
}

export function upgradeLabelForPlan(plan: PlanKey): string {
  return `Disponível no ${PLAN_DISPLAY[plan]}`;
}
