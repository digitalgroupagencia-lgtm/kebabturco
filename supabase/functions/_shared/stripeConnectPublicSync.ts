import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ensureBizumEnabledOnConnectAccount,
  type BizumEnableResult,
} from "./stripeConnectBizum.ts";
import { syncConnectAccountById } from "./stripeConnectSync.ts";
import { pickStripeSecretForEnvironment } from "./stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
  type StoreConnectPaymentRow,
} from "./stripeStoreConnect.ts";
import { sanitizeStoredConnectAccount } from "./stripeConnectAccountGuard.ts";

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
  bizumEnabled?: boolean;
  bizumConfigId?: string | null;
  bizumMessage?: string;
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

/** Sincroniza estado Connect da loja com a Stripe, não exige login (service role no servidor). */
export async function runStoreConnectStatusSync(
  service: SupabaseClient,
  storeId: string,
): Promise<PublicConnectSyncResult> {
  const loaded = await loadStoreConnectPaymentRow(service, storeId);
  if (loaded.error || !loaded.store) {
    throw new Error("Loja não encontrada");
  }

  let store = await refreshLiveConnectStore(service, storeId, loaded.store);

  const connectEnv = await resolveStoreConnectEnvironment(store);
  const stripeKey = pickStripeSecretForEnvironment(
    connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : connectEnv,
  );
  if (!stripeKey) {
    throw new Error("Chave Stripe em falta no servidor, configure STRIPE_SECRET_KEY nos segredos");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const sanitized = await sanitizeStoredConnectAccount(stripe, service, store);
  store = sanitized.store as StoreConnectPaymentRow;
  if (sanitized.cleared) {
    throw new Error(
      "A conta antiga era inválida (conta da plataforma) e foi removida. Clique «Recriar conta Stripe» para criar a conta do restaurante.",
    );
  }

  if (!store.stripe_connect_account_id) {
    throw new Error("Conta de recebimentos não ligada a esta loja");
  }

  const status = await syncConnectAccountById(
    stripe,
    service,
    store.stripe_connect_account_id,
    storeId,
  );

  const connectEnvironment =
    connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : "live";

  let bizum = {
    enabled: false,
    configId: null as string | null,
    message: "Bizum só em modo produção.",
  };
  if (connectEnvironment === "live") {
    bizum = await ensureBizumEnabledOnConnectAccount(stripe, store.stripe_connect_account_id);
  }

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
    connectEnvironment,
    synced: true,
    bizumEnabled: bizum.enabled,
    bizumConfigId: bizum.configId,
    bizumMessage: bizum.message,
  };
}

/** Activa Bizum na conta Connect da loja (sem sincronizar o resto). */
export async function runStoreBizumEnable(
  service: SupabaseClient,
  storeId: string,
): Promise<BizumEnableResult & { accountId: string }> {
  const loaded = await loadStoreConnectPaymentRow(service, storeId);
  if (loaded.error || !loaded.store?.stripe_connect_account_id) {
    throw new Error("Conta de recebimentos não ligada a esta loja");
  }
  const connectEnv = await resolveStoreConnectEnvironment(loaded.store);
  if (connectEnv === "test" || loaded.store.stripe_connect_test_simulated) {
    throw new Error("Bizum só está disponível em modo produção (live).");
  }
  const stripeKey = pickStripeSecretForEnvironment("live");
  if (!stripeKey) {
    throw new Error("Chave Stripe live em falta no servidor");
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const sanitized = await sanitizeStoredConnectAccount(stripe, service, loaded.store);
  if (sanitized.cleared || !sanitized.store.stripe_connect_account_id) {
    throw new Error(
      "Conta de recebimentos inválida, use «Recriar conta Stripe» no painel de administração.",
    );
  }
  const bizum = await ensureBizumEnabledOnConnectAccount(
    stripe,
    sanitized.store.stripe_connect_account_id,
  );
  return { ...bizum, accountId: sanitized.store.stripe_connect_account_id };
}
