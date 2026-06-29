import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeSecretKeyTest } from "./stripeEnv.ts";
import {
  fetchConnectAccountStatus,
  persistConnectAccountStatus,
  type ConnectAccountStatus,
} from "./stripeConnectSync.ts";
import { inspectPlatformConnectStatus } from "./stripePlatform.ts";
import { ConnectError, type ConnectStoreRow } from "./stripeConnectOnboard.ts";

const TEST_IBAN = "ES1100492350842815165376";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function completeTestCustomAccount(
  stripe: Stripe,
  accountId: string,
  storeName: string,
): Promise<Stripe.Account> {
  const email = `kebab-test-${accountId.slice(-8)}@snaporder.test`;

  await stripe.accounts.update(accountId, {
    business_type: "individual",
    individual: {
      first_name: "Kebab",
      last_name: "Teste",
      email,
      phone: "+34600000000",
      dob: { day: 1, month: 1, year: 1990 },
      address: {
        line1: "address_full_match",
        city: "Madrid",
        postal_code: "28001",
        country: "ES",
      },
    },
    business_profile: {
      name: storeName || "Kebab Turco Teste",
      url: "https://kebabturco.net",
      mcc: "5814",
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: "127.0.0.1",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: { schedule: { interval: "manual" } },
    },
  });

  try {
    const external = await stripe.accounts.listExternalAccounts(accountId, {
      object: "bank_account",
      limit: 1,
    });
    if (!external.data.length) {
      await stripe.accounts.createExternalAccount(accountId, {
        external_account: {
          object: "bank_account",
          country: "ES",
          currency: "eur",
          account_number: TEST_IBAN,
        },
      });
    }
  } catch (e) {
    console.warn("[provision_test] external account", e);
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const account = await stripe.accounts.retrieve(accountId);
    if (account.charges_enabled && account.details_submitted) {
      return account;
    }
    await sleep(800);
  }

  return stripe.accounts.retrieve(accountId);
}

async function createTestCustomAccount(
  stripe: Stripe,
  store: ConnectStoreRow,
): Promise<string> {
  const email = `kebab-test-${store.id.slice(0, 8)}@snaporder.test`;
  const account = await stripe.accounts.create({
    type: "custom",
    country: "ES",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    individual: {
      first_name: "Kebab",
      last_name: "Teste",
      email,
      phone: "+34600000000",
      dob: { day: 1, month: 1, year: 1990 },
      address: {
        line1: "address_full_match",
        city: "Madrid",
        postal_code: "28001",
        country: "ES",
      },
    },
    business_profile: {
      name: store.name || "Kebab Turco Teste",
      url: "https://kebabturco.net",
      mcc: "5814",
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: "127.0.0.1",
    },
    metadata: {
      store_id: store.id,
      environment: "test",
      test_provision: "true",
    },
    settings: {
      payouts: { schedule: { interval: "manual" } },
    },
  });

  try {
    await stripe.accounts.createExternalAccount(account.id, {
      external_account: {
        object: "bank_account",
        country: "ES",
        currency: "eur",
        account_number: TEST_IBAN,
      },
    });
  } catch (e) {
    console.warn("[provision_test] initial bank account", e);
  }

  await completeTestCustomAccount(stripe, account.id, store.name || "Kebab Turco Teste");
  return account.id;
}

export type TestProvisionResult = {
  accountId: string;
  status: ConnectAccountStatus;
  simulated: boolean;
  connectEnvironment: "test";
  message: string;
};

/**
 * Cria ou completa conta Connect em modo TESTE — sem formulário embutido.
 * Usa apenas STRIPE_SECRET_KEY_TEST. Não movimenta dinheiro real.
 */
export async function provisionTestConnectAccount(
  service: SupabaseClient,
  store: ConnectStoreRow,
): Promise<TestProvisionResult> {
  const testKey = getStripeSecretKeyTest();
  if (!testKey) {
    const simulatedId = `simulated-${store.id.replace(/-/g, "").slice(0, 12)}`;
    const { error: updErr } = await service
      .from("stores")
      .update({
        stripe_connect_account_id: simulatedId,
        stripe_connect_environment: "test",
        stripe_connect_test_simulated: true,
        stripe_charges_enabled: true,
        stripe_onboarding_completed: true,
        stripe_payouts_enabled: true,
        stripe_payout_status: "active",
        stripe_business_name: store.name ? `${store.name} (teste simulado)` : "Kebab Turco (teste simulado)",
        stripe_iban_last4: "0000",
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (updErr) {
      console.error("[provision_test] simulated without key", updErr);
      throw new ConnectError("Não foi possível activar recebimentos de teste.", 500, "store_update_failed");
    }

    return {
      accountId: simulatedId,
      status: {
        accountId: simulatedId,
        chargesEnabled: true,
        payoutsEnabled: true,
        onboardingCompleted: true,
        payoutStatus: "active",
        businessName: store.name || "Kebab Turco (teste simulado)",
        ibanLast4: "0000",
        requirementsDue: [],
      },
      simulated: true,
      connectEnvironment: "test",
      message:
        "Modo teste simulado activo. Para pagar com cartão 4242, adicione STRIPE_SECRET_KEY_TEST nos segredos do servidor.",
    };
  }

  const stripe = new Stripe(testKey, { apiVersion: "2023-10-16" });
  await inspectPlatformConnectStatus(stripe, "test");

  let accountId = store.stripe_connect_account_id;
  const storedEnv = store.stripe_connect_environment;

  // Conta live ou ambiente errado — criar conta teste nova
  if (accountId && storedEnv === "live") {
    accountId = null;
  }

  if (!accountId) {
    accountId = await createTestCustomAccount(stripe, store);
  } else {
    try {
      await completeTestCustomAccount(stripe, accountId, store.name || "Kebab Turco Teste");
    } catch (e) {
      console.warn("[provision_test] complete existing failed, creating new", e);
      accountId = await createTestCustomAccount(stripe, store);
    }
  }

  const { error: updErr } = await service
    .from("stores")
    .update({
      stripe_connect_account_id: accountId,
      stripe_connect_environment: "test",
      stripe_connect_test_simulated: false,
      stripe_connect_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (updErr) {
    console.error("[provision_test] store update", updErr);
    throw new ConnectError("Conta criada mas não foi possível guardar na loja.", 500, "store_update_failed");
  }

  let status = await fetchConnectAccountStatus(stripe, accountId);
  let simulated = false;

  if (!status.chargesEnabled || !status.onboardingCompleted) {
    simulated = true;
    await service
      .from("stores")
      .update({
        stripe_connect_test_simulated: true,
        stripe_charges_enabled: true,
        stripe_onboarding_completed: true,
        stripe_payouts_enabled: true,
        stripe_payout_status: "active",
        stripe_business_name: store.name || "Kebab Turco (teste simulado)",
        stripe_iban_last4: "0000",
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    status = {
      ...status,
      chargesEnabled: true,
      payoutsEnabled: true,
      onboardingCompleted: true,
      payoutStatus: "active",
      businessName: store.name || "Kebab Turco (teste simulado)",
      ibanLast4: "0000",
    };
  } else {
    await service.from("stores").update({ stripe_connect_test_simulated: false }).eq("id", store.id);
    await persistConnectAccountStatus(service, status);
  }

  const message = simulated
    ? "Modo teste activo. Conta de recebimentos simulada para validação do checkout — sem dinheiro real."
    : "Modo teste activo. Conta Connect de teste pronta — pode pagar com cartão 4242.";

  return {
    accountId,
    status,
    simulated,
    connectEnvironment: "test",
    message,
  };
}
