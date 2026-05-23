import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PLATFORM_FEE_CENTS,
  computeNetToStoreCents,
  computeProcessingFeeCents,
} from "../_shared/stripeFees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function syncAccountProfile(stripe: Stripe, supabase: ReturnType<typeof createClient>, account: Stripe.Account) {
  let ibanLast4: string | null = null;
  try {
    const external = await stripe.accounts.listExternalAccounts(account.id, { object: "bank_account", limit: 1 });
    const bank = external.data[0] as Stripe.BankAccount | undefined;
    if (bank?.last4) ibanLast4 = bank.last4;
  } catch {
    // optional
  }

  const onboardingDone = account.details_submitted === true;
  const payoutStatus = account.payouts_enabled
    ? "active"
    : onboardingDone
      ? "review"
      : "pending";

  await supabase.rpc("sync_store_stripe_profile", {
    _stripe_account_id: account.id,
    _charges_enabled: account.charges_enabled === true,
    _payouts_enabled: account.payouts_enabled === true,
    _onboarding_completed: onboardingDone,
    _business_name: account.business_profile?.name ?? account.company?.name ?? null,
    _iban_last4: ibanLast4,
    _payout_status: payoutStatus,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Webhook não configurado", { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    let stripeFeeCents = Number(pi.metadata?.estimated_stripe_fee_cents || 0);
    const platformFeeCents = Number(pi.metadata?.platform_fee_cents || PLATFORM_FEE_CENTS);

    try {
      const expanded = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge.balance_transaction"] });
      const charge = expanded.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      if (bt?.fee != null) stripeFeeCents = bt.fee;
    } catch {
      // keep estimate
    }

    const grossCents = pi.amount_received || pi.amount;
    const processingFeeCents = computeProcessingFeeCents(platformFeeCents, stripeFeeCents);
    const netToStoreCents = computeNetToStoreCents(grossCents, processingFeeCents);

    await supabase.rpc("record_payment_settlement", {
      _stripe_payment_intent_id: pi.id,
      _platform_fee_cents: platformFeeCents,
      _stripe_fee_cents: stripeFeeCents,
      _processing_fee_cents: processingFeeCents,
      _net_to_store_cents: netToStoreCents,
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await syncAccountProfile(stripe, supabase, account);
  }

  if (event.type === "payout.paid" || event.type === "payout.updated") {
    const payout = event.data.object as Stripe.Payout;
    const accountId = event.account as string | undefined;
    if (accountId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("stripe_connect_account_id", accountId)
        .maybeSingle();

      if (store?.id) {
        await supabase.from("store_payouts").upsert(
          {
            store_id: store.id,
            stripe_payout_id: payout.id,
            amount_cents: payout.amount,
            status: payout.status,
            arrival_date: payout.arrival_date
              ? new Date(payout.arrival_date * 1000).toISOString().slice(0, 10)
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_payout_id" },
        );

        if (payout.status === "paid") {
          await supabase
            .from("stores")
            .update({
              stripe_last_payout_at: new Date().toISOString(),
              stripe_payout_status: "active",
            })
            .eq("id", store.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
