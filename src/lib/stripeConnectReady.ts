import type { StoreFinancialProfile, StoreStripeSettings } from "@/services/orderService";

export function isStripeConnectReady(
  profile: StoreFinancialProfile | StoreStripeSettings | null | undefined,
): boolean {
  if (!profile) return false;
  const full = profile as StoreFinancialProfile;
  if (
    full.stripe_connect_test_simulated &&
    full.stripe_charges_enabled &&
    full.stripe_onboarding_completed
  ) {
    return true;
  }
  if (!profile.stripe_connect_account_id) return false;
  if (profile.stripe_charges_enabled) return true;
  if ("stripe_onboarding_completed" in full && full.stripe_onboarding_completed) return true;
  return false;
}

export function stripeConnectStatusLabel(
  profile: StoreFinancialProfile | null | undefined,
): "ready" | "pending" | "missing" {
  if (!profile?.stripe_connect_account_id) return "missing";
  if (isStripeConnectReady(profile)) return "ready";
  return "pending";
}
