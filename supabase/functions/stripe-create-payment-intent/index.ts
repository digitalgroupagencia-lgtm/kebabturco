import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  handleOperationalDiagnostics,
  handleVerifyPaymentIntent,
  computeApplicationFeeCents,
  PLATFORM_FEE_CENTS,
} from "../_shared/stripePaymentActions.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.action === "diagnostics") {
      return handleOperationalDiagnostics(req, body);
    }

    if (body?.action === "verify") {
      return handleVerifyPaymentIntent(body);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Pagamentos online indisponíveis" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const { storeId, amountCents, orderType, metadata = {} } = body;

    if (!storeId || !amountCents || amountCents < 50 || amountCents > 1_000_00 * 10) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ALLOWED_META_KEYS = new Set(["order_id", "order_number", "table_number", "customer_name"]);
    const safeMeta: Record<string, string> = {};
    if (metadata && typeof metadata === "object") {
      for (const [k, v] of Object.entries(metadata)) {
        if (ALLOWED_META_KEYS.has(k) && typeof v === "string" && v.length <= 200) {
          safeMeta[k] = v;
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("stripe_connect_account_id, stripe_charges_enabled, stripe_onboarding_completed")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr || !store?.stripe_connect_account_id || !store.stripe_charges_enabled) {
      return new Response(JSON.stringify({ error: "Recebimentos online ainda não activos para esta loja" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const applicationFeeCents = computeApplicationFeeCents(amountCents);
    const estimatedStripeFeeCents = applicationFeeCents - PLATFORM_FEE_CENTS;

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: store.stripe_connect_account_id },
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...safeMeta,
        store_id: storeId,
        order_type: orderType || "dine_in",
        platform_fee_cents: String(PLATFORM_FEE_CENTS),
        estimated_stripe_fee_cents: String(estimatedStripeFeeCents),
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        estimatedProcessingFeeCents: applicationFeeCents,
        platformFeeCents: PLATFORM_FEE_CENTS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao iniciar pagamento";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
