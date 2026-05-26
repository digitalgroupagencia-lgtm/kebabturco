import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PLATFORM_FEE_CENTS,
  computeNetToStoreCents,
  estimatedStripeFeeInServiceFee,
} from "./stripeFees.ts";
import { getStripeSecretKey, getStripeWebhookSecret } from "./stripeEnv.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDGE_FUNCTIONS = [
  "operational-diagnostics",
  "stripe-verify-payment-intent",
  "stripe-create-payment-intent",
  "stripe-webhook",
  "print-order",
] as const;

async function functionReachable(baseUrl: string, name: string, anonKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: "OPTIONS",
      headers: { apikey: anonKey },
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

export async function handleOperationalDiagnostics(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Autenticação necessária" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "Sessão inválida" }, 401);
  }

  const service = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await service.from("user_roles").select("role").eq("user_id", userData.user.id);
  const allowed = (roles ?? []).some((r) =>
    ["admin_master", "restaurant_admin", "operator"].includes(r.role as string)
  );
  if (!allowed) {
    return json({ error: "Sem permissão" }, 403);
  }

  const storeId = typeof body.storeId === "string" ? body.storeId : null;
  const stripeSecret = getStripeSecretKey() ?? "";
  const webhookSecret = getStripeWebhookSecret() ?? "";

  let storeProfile: Record<string, unknown> | null = null;
  if (storeId) {
    const { data } = await service
      .from("stores")
      .select(
        "id, stripe_connect_account_id, stripe_charges_enabled, stripe_onboarding_completed, stripe_payouts_enabled",
      )
      .eq("id", storeId)
      .maybeSingle();
    storeProfile = data;
  }

  const functions: Record<string, boolean> = {};
  for (const fn of EDGE_FUNCTIONS) {
    functions[fn] = await functionReachable(supabaseUrl, fn, anonKey);
  }
  functions["stripe-create-payment-intent"] = true;

  let webhookConfigured = false;
  let webhookUrl: string | null = null;
  let webhookEvents: string[] = [];
  const expectedWebhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;

  if (stripeSecret) {
    try {
      const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
      const list = await stripe.webhookEndpoints.list({ limit: 30 });
      const match = list.data.find(
        (w) => w.url === expectedWebhookUrl || w.url.includes("/stripe-webhook"),
      );
      if (match) {
        webhookConfigured = match.status === "enabled";
        webhookUrl = match.url;
        webhookEvents = match.enabled_events ?? [];
      }
    } catch (e) {
      console.error("[diagnostics] stripe webhooks", e);
    }
  }

  return json({
    stripeSecretKey: Boolean(stripeSecret),
    stripeWebhookSecret: Boolean(webhookSecret),
    webhookConfigured,
    webhookUrl,
    webhookExpectedUrl: expectedWebhookUrl,
    webhookEvents,
    edgeFunctions: functions,
    store: storeProfile,
    servedBy: "stripe-create-payment-intent",
  });
}

export async function handleVerifyPaymentIntent(body: Record<string, unknown>): Promise<Response> {
  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    return json({ error: "Pagamentos online indisponíveis" }, 503);
  }

  const storeId = body.storeId as string;
  const paymentIntentId = body.paymentIntentId as string;
  const orderId = body.orderId as string;
  const amountCents = body.amountCents as number;

  if (!storeId || !paymentIntentId || !orderId || !amountCents) {
    return json({ error: "Parâmetros inválidos" }, 400);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, store_id, total, subtotal, delivery_fee, discount_amount, payment_status, stripe_payment_intent_id, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order || order.store_id !== storeId) {
    return json({ error: "Pedido não encontrado" }, 404);
  }

  if (order.payment_status === "paid") {
    return json({ success: true, alreadyPaid: true });
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return json({ error: "Pagamento ainda não confirmado" }, 402);
  }

  if (pi.metadata?.store_id && pi.metadata.store_id !== storeId) {
    return json({ error: "Loja inválida para este pagamento" }, 403);
  }

  const expectedCents = Math.round(Number(order.total) * 100);
  if (pi.amount_received !== expectedCents && pi.amount !== expectedCents) {
    return json({ error: "Valor do pagamento não corresponde ao pedido" }, 400);
  }

  if (amountCents !== expectedCents) {
    return json({ error: "Valor inválido" }, 400);
  }

  const restaurantPortionCents = Number(
    pi.metadata?.restaurant_portion_cents ||
      Math.round(
        (Number(order.subtotal) + Number(order.delivery_fee ?? 0) - Number(order.discount_amount ?? 0)) * 100,
      ),
  );
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
    /* estimate ok */
  }

  const netToStoreCents = computeNetToStoreCents(restaurantPortionCents);

  const { data: settled, error: settleErr } = await supabase.rpc("record_payment_settlement", {
    _stripe_payment_intent_id: paymentIntentId,
    _platform_fee_cents: platformFeeCents,
    _stripe_fee_cents: stripeFeeCents,
    _processing_fee_cents: onlineServiceFeeCents,
    _net_to_store_cents: netToStoreCents,
    _online_service_fee_cents: onlineServiceFeeCents,
  });

  if (settleErr) {
    return json({ error: settleErr.message }, 500);
  }

  if (settled && typeof settled === "object" && (settled as { success?: boolean }).success === false) {
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: "card",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  }

  return json({ success: true, orderId, orderNumber: order.order_number });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export { PLATFORM_FEE_CENTS };
export {
  computeApplicationFeeCents,
  computeCustomerTotalCents,
  computeOnlineServiceFeeCents,
  computeRestaurantPortionCents,
} from "./stripeFees.ts";
