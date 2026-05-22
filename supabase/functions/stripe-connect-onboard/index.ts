import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return new Response(JSON.stringify({ error: "Stripe não configurado" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, returnUrl } = await req.json();
    if (!storeId || !returnUrl) {
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

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, stripe_connect_account_id")
      .eq("id", storeId)
      .maybeSingle();

    if (!store) {
      return new Response(JSON.stringify({ error: "Loja não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accountId = store.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: store.name || "Restaurante" },
      });
      accountId = account.id;
      await supabase
        .from("stores")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", storeId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro Stripe Connect";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
