import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isPlatformConnectAccountId } from "./stripePlatform.ts";

export async function clearStoreConnectAccountFields(
  service: SupabaseClient,
  storeId: string,
): Promise<void> {
  await service
    .from("stores")
    .update({
      stripe_connect_account_id: null,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_onboarding_completed: false,
      stripe_payout_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
}

export type ConnectAccountStoreRow = {
  id: string;
  stripe_connect_account_id: string | null;
};

/** Removes a platform account id that was mistakenly stored as the restaurant connect account. */
export async function sanitizeStoredConnectAccount<T extends ConnectAccountStoreRow>(
  stripe: Stripe,
  service: SupabaseClient,
  store: T,
): Promise<{ store: T; cleared: boolean }> {
  const accountId = store.stripe_connect_account_id;
  if (!accountId || accountId.startsWith("simulated-")) {
    return { store, cleared: false };
  }

  const isPlatform = await isPlatformConnectAccountId(stripe, accountId);
  if (!isPlatform) {
    return { store, cleared: false };
  }

  console.warn(
    "[connect] clearing platform account id stored as connect account",
    store.id,
    accountId,
  );
  await clearStoreConnectAccountFields(service, store.id);
  return { store: { ...store, stripe_connect_account_id: null }, cleared: true };
}
