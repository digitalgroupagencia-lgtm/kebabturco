import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APPLICATION_FEE_CENTS = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe não configurado" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const { storeId, amountCents, orderType, metadata = {} } = await req.json();

    if (!storeId || !amountCents || amountCents < 50 || amountCents > 1_000_00 * 10) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Whitelist de chaves de metadata permitidas (evita injeção)
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
      .select("stripe_connect_account_id, stripe_charges_enabled")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr || !store?.stripe_connect_account_id || !store.stripe_charges_enabled) {
      return new Response(JSON.stringify({ error: "Restaurante sem pagamentos online activos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      application_fee_amount: APPLICATION_FEE_CENTS,
      transfer_data: { destination: store.stripe_connect_account_id },
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...safeMeta,
        store_id: storeId,
        order_type: orderType || "dine_in",
      },

    });

    return new Response(
      JSON.stringify({ clientSecret: intent.client_secret, paymentIntentId: intent.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro Stripe";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
