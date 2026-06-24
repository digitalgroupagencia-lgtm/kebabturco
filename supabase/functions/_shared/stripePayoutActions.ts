import type Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function upsertStorePayoutFromStripe(
  supabase: SupabaseClient,
  storeId: string,
  payout: Stripe.Payout,
): Promise<void> {
  const patch = {
    store_id: storeId,
    stripe_payout_id: payout.id,
    amount_cents: payout.amount,
    status: payout.status,
    arrival_date: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString().slice(0, 10)
      : null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("store_payouts")
    .select("id")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("store_payouts").update(patch).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("store_payouts").insert({
      ...patch,
      created_at: new Date(payout.created * 1000).toISOString(),
    });
    if (error) throw error;
  }

  if (payout.status === "paid") {
    await supabase
      .from("stores")
      .update({
        stripe_last_payout_at: new Date().toISOString(),
        stripe_payout_status: "active",
      })
      .eq("id", storeId);
  }

  if (payout.status === "failed") {
    await supabase
      .from("stores")
      .update({
        stripe_payout_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
  }
}

export async function syncStorePayoutsFromStripe(
  stripe: Stripe,
  supabase: SupabaseClient,
  storeId: string,
  accountId: string,
  limit = 50,
): Promise<number> {
  const payouts = await stripe.payouts.list({ limit }, { stripeAccount: accountId });
  for (const payout of payouts.data) {
    await upsertStorePayoutFromStripe(supabase, storeId, payout);
  }
  return payouts.data.length;
}

export async function resolveStoreIdForConnectAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<string | null> {
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  return store?.id ?? null;
}
