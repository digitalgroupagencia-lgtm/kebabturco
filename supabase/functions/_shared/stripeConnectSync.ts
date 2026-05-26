import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const onboardingCompleted = account.details_submitted === true;
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
): Promise<void> {
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
): Promise<ConnectAccountStatus> {
  const status = await fetchConnectAccountStatus(stripe, accountId);
  await persistConnectAccountStatus(service, status);
  return status;
}
