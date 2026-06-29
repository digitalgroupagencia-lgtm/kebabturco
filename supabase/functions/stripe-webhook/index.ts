import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncConnectAccountById } from "../_shared/stripeConnectSync.ts";
import {
  recordFailedPaymentIntent,
  settleSucceededPaymentIntent,
} from "../_shared/stripePaymentActions.ts";
import {
  getStripeSecretKey,
  getStripeSecretKeyTest,
  getStripeWebhookSecretCandidates,
  hasAnyStripeWebhookSecret,
  stripeKeyMode,
} from "../_shared/stripeEnv.ts";
import {
  resolveStoreIdForConnectAccount,
  upsertStorePayoutFromStripe,
} from "../_shared/stripePayoutActions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PAYOUT_EVENTS = new Set([
  "payout.created",
  "payout.paid",
  "payout.updated",
  "payout.failed",
]);

const ESTIMATED_DISPUTE_FEE_CENTS = 1500;

/** Recupera do restaurante a parte transferida quando há chargeback (Destination Charge). */
async function reverseTransferForDispute(
  stripe: Stripe,
  dispute: Stripe.Dispute,
): Promise<{
  reversedCents: number;
  storeId: string | null;
  disputeFeeCents: number;
  connectedAccountId: string | null;
}> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    return { reversedCents: 0, storeId: null, disputeFeeCents: ESTIMATED_DISPUTE_FEE_CENTS, connectedAccountId: null };
  }

  const charge = await stripe.charges.retrieve(chargeId, { expand: ["payment_intent"] });
  const pi = charge.payment_intent as Stripe.PaymentIntent | null;
  const storeId = typeof pi?.metadata?.store_id === "string" ? pi.metadata.store_id : null;

  let disputeFeeCents = ESTIMATED_DISPUTE_FEE_CENTS;
  try {
    const expanded = await stripe.disputes.retrieve(dispute.id, { expand: ["balance_transactions"] });
    const feeTx = (expanded.balance_transactions as Stripe.BalanceTransaction[] | undefined)?.find(
      (tx) => tx.fee > 0,
    );
    if (feeTx?.fee) disputeFeeCents = feeTx.fee;
  } catch {
    /* keep estimate */
  }

  const transferId = typeof charge.transfer === "string" ? charge.transfer : charge.transfer?.id;
  if (!transferId) return { reversedCents: 0, storeId, disputeFeeCents, connectedAccountId: null };

  const transfer = await stripe.transfers.retrieve(transferId);
  const connectedAccountId =
    typeof transfer.destination === "string" ? transfer.destination : transfer.destination?.id ?? null;
  const alreadyReversed = transfer.amount_reversed ?? 0;
  const reversible = transfer.amount - alreadyReversed;
  if (reversible <= 0) return { reversedCents: 0, storeId, disputeFeeCents, connectedAccountId };

  const reverseAmount = Math.min(reversible, dispute.amount);
  if (reverseAmount <= 0) return { reversedCents: 0, storeId, disputeFeeCents, connectedAccountId };

  await stripe.transfers.createReversal(transferId, {
    amount: reverseAmount,
    description: `Chargeback reversal for dispute ${dispute.id}`,
    metadata: {
      dispute_id: dispute.id,
      reason: "chargeback_restaurant_portion",
    },
  });

  return { reversedCents: reverseAmount, storeId, disputeFeeCents, connectedAccountId };
}

/** Tenta recuperar a taxa de contestação do saldo do restaurante (não via Stripe automaticamente). */
async function recoverDisputeFeeFromRestaurant(
  stripe: Stripe,
  connectedAccountId: string,
  disputeFeeCents: number,
  disputeId: string,
): Promise<boolean> {
  if (disputeFeeCents <= 0) return false;
  try {
    const platform = await stripe.accounts.retrieve();
    await stripe.transfers.create(
      {
        amount: disputeFeeCents,
        currency: "eur",
        destination: platform.id,
        metadata: { dispute_id: disputeId, reason: "dispute_fee_recovery" },
      },
      { stripeAccount: connectedAccountId },
    );
    return true;
  } catch (e) {
    console.warn("[dispute] fee recovery transfer failed", e);
    return false;
  }
}

async function recordDisputeLedgerForStore(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  dispute: Stripe.Dispute,
  reversedCents: number,
  disputeFeeCents: number,
): Promise<void> {
  const marker = `dispute:${dispute.id}`;
  const { data: existing } = await supabase
    .from("store_payment_ledger")
    .select("id")
    .eq("store_id", storeId)
    .ilike("description", `${marker}%`)
    .limit(1);
  if (existing?.length) return;

  if (reversedCents > 0) {
    await supabase.from("store_payment_ledger").insert({
      store_id: storeId,
      entry_type: "dispute_reversal",
      gross_cents: reversedCents,
      platform_fee_cents: 0,
      stripe_fee_cents: 0,
      processing_fee_cents: 0,
      net_cents: -reversedCents,
      description: `${marker}: contestação — valor do pedido`,
    });
  }

  if (disputeFeeCents > 0) {
    await supabase.from("store_payment_ledger").insert({
      store_id: storeId,
      entry_type: "dispute_fee",
      gross_cents: 0,
      platform_fee_cents: 0,
      stripe_fee_cents: disputeFeeCents,
      processing_fee_cents: disputeFeeCents,
      net_cents: -disputeFeeCents,
      description: `${marker}: taxa de contestação`,
    });
  }
}

async function resolveWebhookContext(body: string, signature: string): Promise<{
  stripe: Stripe;
  event: Stripe.Event;
  mode: "live" | "test";
} | null> {
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
    const stripe = new Stripe(key, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    try {
      const event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        secret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
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
  const resolved = await resolveWebhookContext(body, signature);
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
    const result = await settleSucceededPaymentIntent(stripe, supabase, pi);
    if (!result.success) {
      console.error("[stripe-webhook] payment_intent.succeeded settlement failed", pi.id, result.error);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    try {
      await recordFailedPaymentIntent(supabase, pi);
    } catch (e) {
      console.error("[stripe-webhook] payment_intent.payment_failed", pi.id, e);
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await syncConnectAccountById(stripe, supabase, account.id);
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    try {
      const result = await reverseTransferForDispute(stripe, dispute);
      if (result.connectedAccountId) {
        await recoverDisputeFeeFromRestaurant(
          stripe,
          result.connectedAccountId,
          result.disputeFeeCents,
          dispute.id,
        );
      }
      if (result.storeId) {
        await recordDisputeLedgerForStore(
          supabase,
          result.storeId,
          dispute,
          result.reversedCents,
          result.disputeFeeCents,
        );
      }
    } catch (e) {
      console.error("charge.dispute.created transfer reversal failed", e);
    }
  }

  if (PAYOUT_EVENTS.has(event.type)) {
    const payout = event.data.object as Stripe.Payout;
    const accountId = event.account as string | undefined;
    if (accountId) {
      const storeId = await resolveStoreIdForConnectAccount(supabase, accountId);
      if (storeId) {
        try {
          await upsertStorePayoutFromStripe(supabase, storeId, payout);
        } catch (e) {
          console.error(`[stripe-webhook] ${event.type}`, payout.id, e);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
