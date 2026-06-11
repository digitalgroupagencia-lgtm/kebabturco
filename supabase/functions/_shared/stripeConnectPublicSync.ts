import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncConnectAccountById } from "./stripeConnectSync.ts";
import { pickStripeSecretForEnvironment } from "./stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
  type StoreConnectPaymentRow,
} from "./stripeStoreConnect.ts";

export type PublicConnectSyncResult = {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompleted: boolean;
  payoutStatus: string;
  businessName: string | null;
  ibanLast4: string | null;
  requirementsDue: string[];
  ready: boolean;
  connectEnvironment: "live" | "test";
  synced: boolean;
};

async function refreshLiveConnectStore(
  supabase: SupabaseClient,
  storeId: string,
  store: StoreConnectPaymentRow,
): Promise<StoreConnectPaymentRow> {
  if (!store.stripe_connect_account_id || store.stripe_connect_test_simulated) return store;
  const liveKey = pickStripeSecretForEnvironment("live");
  if (!liveKey) return store;
  try {
    const stripe = new Stripe(liveKey, { apiVersion: "2023-10-16" });
    await syncConnectAccountById(stripe, supabase, store.stripe_connect_account_id, storeId);
    const reloaded = await loadStoreConnectPaymentRow(supabase, storeId);
    return reloaded.store ?? store;
  } catch (e) {
    console.warn("[connect] public sync live refresh skipped", e);
    return store;
  }
}

/** Sincroniza estado Connect da loja com a Stripe — não exige login (service role no servidor). */
export async function runStoreConnectStatusSync(
  service: SupabaseClient,
  storeId: string,
): Promise<PublicConnectSyncResult> {
  const loaded = await loadStoreConnectPaymentRow(service, storeId);
  if (loaded.error || !loaded.store) {
    throw new Error("Loja não encontrada");
  }

  let store = await refreshLiveConnectStore(service, storeId, loaded.store);

  if (!store.stripe_connect_account_id) {
    throw new Error("Conta de recebimentos não ligada a esta loja");
  }

  const connectEnv = await resolveStoreConnectEnvironment(store);
  const stripeKey = pickStripeSecretForEnvironment(
    connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : connectEnv,
  );
  if (!stripeKey) {
    throw new Error("Chave Stripe em falta no servidor — configure STRIPE_SECRET_KEY nos segredos");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const status = await syncConnectAccountById(
    stripe,
    service,
    store.stripe_connect_account_id,
    storeId,
  );

  return {
    accountId: status.accountId,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    onboardingCompleted: status.onboardingCompleted,
    payoutStatus: status.payoutStatus,
    businessName: status.businessName,
    ibanLast4: status.ibanLast4,
    requirementsDue: status.requirementsDue,
    ready: status.chargesEnabled && status.onboardingCompleted,
    connectEnvironment: connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : "live",
    synced: true,
  };
}
