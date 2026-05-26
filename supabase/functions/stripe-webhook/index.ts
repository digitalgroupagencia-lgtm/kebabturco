import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PLATFORM_FEE_CENTS,
  computeNetToStoreCents,
  estimatedStripeFeeInServiceFee,
} from "../_shared/stripeFees.ts";
import { syncConnectAccountById } from "../_shared/stripeConnectSync.ts";
import {
  getStripeSecretKey,
  getStripeSecretKeyTest,
  getStripeWebhookSecretCandidates,
  hasAnyStripeWebhookSecret,
  stripeKeyMode,
} from "../_shared/stripeEnv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function upsertPayout(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  payout: Stripe.Payout,
) {
  await supabase.from("store_payouts").upsert(
    {
      store_id: storeId,
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

function resolveWebhookContext(body: string, signature: string): {
  stripe: Stripe;
  event: Stripe.Event;
  mode: "live" | "test";
} | null {
  const candidates: Array<{ key: string; secret: string }> = [];
  const liveKey = getStripeSecretKey();
  const testKey = getStripeSecretKeyTest();

  if (liveKey) {
    for (const secret of getStripeWebhookSecretCandidates("live")) {
      candidates.push({ key: liveKey, secret });
    }
  }
  if (testKey && testKey !== liveKey) {
    for (const secret of getStripeWebhookSecretCandidates("test")) {
      candidates.push({ key: testKey, secret });
    }
  }

  for (const { key, secret } of candidates) {
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" });
    try {
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      return { stripe, event, mode: stripeKeyMode(key) };
    } catch {
      /* try next secret */
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!hasAnyStripeWebhookSecret() || (!getStripeSecretKey() && !getStripeSecretKeyTest())) {
    return new Response("Webhook não configurado", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  const resolved = resolveWebhookContext(body, signature);
  if (!resolved) {
    return new Response("Webhook Error: Invalid signature", { status: 400 });
  }

  const { stripe, event } = resolved;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const restaurantPortionCents = Number(pi.metadata?.restaurant_portion_cents || 0);
    const onlineServiceFeeCents = Number(
      pi.metadata?.online_service_fee_cents || pi.application_fee_amount || 0,
    );
    const platformFeeCents = Number(pi.metadata?.platform_fee_cents || PLATFORM_FEE_CENTS);
    let stripeFeeCents = Number(
      pi.metadata?.estimated_stripe_fee_cents || estimatedStripeFeeInServiceFee(onlineServiceFeeCents),
    );

    try {
      const expanded = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge.balance_transaction"] });
      const charge = expanded.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      if (bt?.fee != null) stripeFeeCents = bt.fee;
    } catch {
      /* keep estimate */
    }

    const netToStoreCents = computeNetToStoreCents(
      restaurantPortionCents || Math.max(0, (pi.amount_received || pi.amount) - onlineServiceFeeCents),
    );

    await supabase.rpc("record_payment_settlement", {
      _stripe_payment_intent_id: pi.id,
      _platform_fee_cents: platformFeeCents,
      _stripe_fee_cents: stripeFeeCents,
      _processing_fee_cents: onlineServiceFeeCents,
      _net_to_store_cents: netToStoreCents,
      _online_service_fee_cents: onlineServiceFeeCents,
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await syncConnectAccountById(stripe, supabase, account.id);
  }

  if (
    event.type === "payout.paid" ||
    event.type === "payout.updated" ||
    event.type === "payout.failed"
  ) {
    const payout = event.data.object as Stripe.Payout;
    const accountId = event.account as string | undefined;
    if (accountId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("stripe_connect_account_id", accountId)
        .maybeSingle();

      if (store?.id) {
        await upsertPayout(supabase, store.id, payout);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
