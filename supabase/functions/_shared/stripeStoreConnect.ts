import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKeyTest } from "./stripeEnv.ts";
import { buildLivePlatformStatus } from "./stripePlatform.ts";
import type { StripeKeyMode } from "./stripeEnv.ts";

export type StoreConnectPaymentRow = {
  stripe_connect_account_id: string | null;
  stripe_connect_environment: string | null;
  stripe_charges_enabled: boolean;
  stripe_onboarding_completed: boolean;
  stripe_payouts_enabled: boolean;
  stripe_connect_test_simulated?: boolean;
  stripe_terminal_location_id?: string | null;
};

const STORE_CONNECT_SELECT =
  "stripe_connect_account_id, stripe_connect_environment, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled, stripe_connect_test_simulated, stripe_terminal_location_id";

const STORE_CONNECT_SELECT_LEGACY =
  "stripe_connect_account_id, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled";

export async function loadStoreConnectPaymentRow(
  supabase: SupabaseClient,
  storeId: string,
): Promise<{ store: StoreConnectPaymentRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_CONNECT_SELECT)
    .eq("id", storeId)
    .maybeSingle();

  if (!error) {
    return { store: data as StoreConnectPaymentRow, error: null };
  }

  if (String(error.message).includes("stripe_connect_environment")) {
    const legacy = await supabase
      .from("stores")
      .select(STORE_CONNECT_SELECT_LEGACY)
      .eq("id", storeId)
      .maybeSingle();
    if (legacy.error || !legacy.data) {
      return { store: null, error: legacy.error?.message ?? error.message };
    }
    return {
      store: {
        ...(legacy.data as Omit<StoreConnectPaymentRow, "stripe_connect_environment" | "stripe_connect_test_simulated">),
        stripe_connect_environment: null,
        stripe_connect_test_simulated: false,
      },
      error: null,
    };
  }

  if (String(error.message).includes("stripe_connect_test_simulated")) {
    const partial = await supabase
      .from("stores")
      .select(
        "stripe_connect_account_id, stripe_connect_environment, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled",
      )
      .eq("id", storeId)
      .maybeSingle();
    if (partial.error || !partial.data) {
      return { store: null, error: partial.error?.message ?? error.message };
    }
    return {
      store: { ...(partial.data as StoreConnectPaymentRow), stripe_connect_test_simulated: false },
      error: null,
    };
  }

  return { store: null, error: error.message };
}

/** Resolve ambiente Connect da loja (test/live), com fallback enquanto migration não aplicada. */
export async function resolveStoreConnectEnvironment(
  store: StoreConnectPaymentRow,
): Promise<StripeKeyMode> {
  if (store.stripe_connect_environment === "test") return "test";
  if (store.stripe_connect_environment === "live") return "live";

  if (getStripeSecretKeyTest()) {
    const livePlatform = await buildLivePlatformStatus();
    if (livePlatform?.productionBlocked) return "test";
  }

  return "live";
}
