import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PLATFORM_FEE_CENTS,
  computeNetToStoreCents,
  computeProcessingFeeCents,
} from "../_shared/stripeFees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Pagamentos online indisponíveis" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, paymentIntentId, orderId, amountCents } = await req.json();
    if (!storeId || !paymentIntentId || !orderId || !amountCents) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, store_id, total, payment_status, stripe_payment_intent_id, order_number")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order || order.store_id !== storeId) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      return new Response(JSON.stringify({ error: "Pagamento ainda não confirmado" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pi.metadata?.store_id && pi.metadata.store_id !== storeId) {
      return new Response(JSON.stringify({ error: "Loja inválida para este pagamento" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedCents = Math.round(Number(order.total) * 100);
    if (pi.amount_received !== expectedCents && pi.amount !== expectedCents) {
      return new Response(JSON.stringify({ error: "Valor do pagamento não corresponde ao pedido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amountCents !== expectedCents) {
      return new Response(JSON.stringify({ error: "Valor inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let stripeFeeCents = Number(pi.metadata?.estimated_stripe_fee_cents || 0);
    const platformFeeCents = Number(pi.metadata?.platform_fee_cents || PLATFORM_FEE_CENTS);
    try {
      const expanded = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge.balance_transaction"] });
      const charge = expanded.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      if (bt?.fee != null) stripeFeeCents = bt.fee;
    } catch {
      /* estimate ok */
    }

    const processingFeeCents = computeProcessingFeeCents(platformFeeCents, stripeFeeCents);
    const netToStoreCents = computeNetToStoreCents(expectedCents, processingFeeCents);

    const { data: settled, error: settleErr } = await supabase.rpc("record_payment_settlement", {
      _stripe_payment_intent_id: paymentIntentId,
      _platform_fee_cents: platformFeeCents,
      _stripe_fee_cents: stripeFeeCents,
      _processing_fee_cents: processingFeeCents,
      _net_to_store_cents: netToStoreCents,
    });

    if (settleErr) {
      return new Response(JSON.stringify({ error: settleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ success: true, orderId, orderNumber: order.order_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao confirmar pagamento";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
