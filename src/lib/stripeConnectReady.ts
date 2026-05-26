import type { StoreFinancialProfile, StoreStripeSettings } from "@/services/orderService";

/** Conta Connect pronta para aceitar pagamentos com cartão online. */
export function isStripeConnectReady(
  profile: StoreFinancialProfile | StoreStripeSettings | null | undefined,
): boolean {
  if (!profile?.stripe_connect_account_id) return false;
  if (!profile.stripe_charges_enabled) return false;
  const full = profile as StoreFinancialProfile;
  if ("stripe_onboarding_completed" in full && !full.stripe_onboarding_completed) return false;
  return true;
}

export function stripeConnectStatusLabel(
  profile: StoreFinancialProfile | null | undefined,
): "ready" | "pending" | "missing" {
  if (!profile?.stripe_connect_account_id) return "missing";
  if (isStripeConnectReady(profile)) return "ready";
  return "pending";
}
