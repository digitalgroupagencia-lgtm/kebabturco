import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ensureConnectChargebackRecoverySettings } from "./stripeConnectCustomProvision.ts";
import { applyConnectPayoutPolicy } from "./stripePayoutPolicy.ts";

export function isSimulatedConnectAccountId(accountId: string | null | undefined): boolean {
  return Boolean(accountId?.startsWith("simulated-"));
}

async function simulatedConnectStatusFromStore(
  service: SupabaseClient,
  accountId: string,
  storeId?: string,
): Promise<ConnectAccountStatus | null> {
  if (!storeId) return null;
  const { data: store } = await service
    .from("stores")
    .select(
      "stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed, stripe_payout_status, stripe_business_name, stripe_iban_last4",
    )
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return null;
  return {
    accountId,
    chargesEnabled: store.stripe_charges_enabled === true,
    payoutsEnabled: store.stripe_payouts_enabled === true,
    onboardingCompleted: store.stripe_onboarding_completed === true,
    payoutStatus: store.stripe_payout_status ?? "pending",
    businessName: store.stripe_business_name ?? null,
    ibanLast4: store.stripe_iban_last4 ?? null,
    requirementsDue: [],
  };
}

export type ConnectAccountStatus = {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompleted: boolean;
  payoutStatus: string;
  businessName: string | null;
  ibanLast4: string | null;
  requirementsDue: string[];
};

export async function fetchConnectAccountStatus(
  stripe: Stripe,
  accountId: string,
): Promise<ConnectAccountStatus> {
  const account = await stripe.accounts.retrieve(accountId);
  return mapAccountToStatus(stripe, account);
}

export async function mapAccountToStatus(
  stripe: Stripe,
  account: Stripe.Account,
): Promise<ConnectAccountStatus> {
  let ibanLast4: string | null = null;
  try {
    const external = await stripe.accounts.listExternalAccounts(account.id, {
      object: "bank_account",
      limit: 1,
    });
    const bank = external.data[0] as Stripe.BankAccount | undefined;
    if (bank?.last4) ibanLast4 = bank.last4;
  } catch {
    /* optional */
  }

  const onboardingCompleted =
    account.charges_enabled === true || account.details_submitted === true;
  const payoutStatus = account.payouts_enabled
    ? "active"
    : onboardingCompleted
      ? "review"
      : "pending";

  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];

  return {
    accountId: account.id,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    onboardingCompleted,
    payoutStatus,
    businessName: account.business_profile?.name ?? account.company?.name ?? null,
    ibanLast4,
    requirementsDue,
  };
}

export async function persistConnectAccountStatus(
  service: SupabaseClient,
  status: ConnectAccountStatus,
  storeId?: string,
): Promise<void> {
  if (storeId) {
    const { error } = await service
      .from("stores")
      .update({
        stripe_connect_account_id: status.accountId,
        stripe_connect_environment: "live",
        stripe_connect_test_simulated: false,
        stripe_charges_enabled: status.chargesEnabled,
        stripe_payouts_enabled: status.payoutsEnabled,
        stripe_onboarding_completed: status.onboardingCompleted,
        stripe_business_name: status.businessName,
        stripe_iban_last4: status.ibanLast4,
        stripe_payout_status: status.payoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    if (!error) return;
    console.warn("[connect] persist by store_id failed, fallback rpc", error);
  }

  await service.rpc("sync_store_stripe_profile", {
    _stripe_account_id: status.accountId,
    _charges_enabled: status.chargesEnabled,
    _payouts_enabled: status.payoutsEnabled,
    _onboarding_completed: status.onboardingCompleted,
    _business_name: status.businessName,
    _iban_last4: status.ibanLast4,
    _payout_status: status.payoutStatus,
  });
}

export async function syncConnectAccountById(
  stripe: Stripe,
  service: SupabaseClient,
  accountId: string,
  storeId?: string,
): Promise<ConnectAccountStatus> {
  if (isSimulatedConnectAccountId(accountId)) {
    const simulated =
      (await simulatedConnectStatusFromStore(service, accountId, storeId)) ??
      ({
        accountId,
        chargesEnabled: true,
        payoutsEnabled: false,
        onboardingCompleted: true,
        payoutStatus: "pending",
        businessName: null,
        ibanLast4: null,
        requirementsDue: [],
      } satisfies ConnectAccountStatus);
    await persistConnectAccountStatus(service, simulated, storeId);
    return simulated;
  }

  try {
    await ensureConnectChargebackRecoverySettings(stripe, accountId);
  } catch (e) {
    console.warn("[connect] debit_negative_balances update skipped", e);
  }
  try {
    await applyConnectPayoutPolicy(stripe, accountId);
  } catch (e) {
    console.warn("[connect] payout policy on sync", e);
  }
  const status = await fetchConnectAccountStatus(stripe, accountId);
  await persistConnectAccountStatus(service, status, storeId);
  return status;
}
