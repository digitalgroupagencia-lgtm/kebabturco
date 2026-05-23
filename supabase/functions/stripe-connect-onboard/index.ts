import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function assertStoreAccess(
  supabase: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  userId: string,
  storeId: string,
) {
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, tenant_id, stripe_connect_account_id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) throw new Error("Loja não encontrada");

  const { data: roles } = await userClient.from("user_roles").select("role, tenant_id").eq("user_id", userId);
  const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
  const tenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean);
  if (!isAdminMaster && !tenantIds.includes(store.tenant_id)) {
    throw new Error("Forbidden");
  }

  return store;
}

async function ensureConnectAccount(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  store: { id: string; name: string | null; stripe_connect_account_id: string | null },
) {
  if (store.stripe_connect_account_id) return store.stripe_connect_account_id;

  const account = await stripe.accounts.create({
    type: "express",
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { name: store.name || "Restaurante" },
    settings: {
      payouts: { schedule: { interval: "daily" } },
    },
  });

  await supabase
    .from("stores")
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_created_at: new Date().toISOString(),
      stripe_payout_status: "pending",
    })
    .eq("id", store.id);

  return account.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Pagamentos indisponíveis" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { storeId, returnUrl, mode = "provision" } = body;

    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const store = await assertStoreAccess(supabase, userClient, claimsData.claims.sub as string, storeId);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const accountId = await ensureConnectAccount(stripe, supabase, store);

    if (mode === "provision") {
      return new Response(JSON.stringify({ accountId, provisioned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "account_session") {
      const session = await stripe.accountSessions.create({
        account: accountId,
        components: { account_onboarding: { enabled: true } },
      });
      return new Response(JSON.stringify({ clientSecret: session.client_secret, accountId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode !== "onboarding_link" && mode !== "account_link") {
      return new Response(JSON.stringify({ error: "Modo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!returnUrl) {
      return new Response(JSON.stringify({ error: "returnUrl obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const u = new URL(returnUrl);
      if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("invalid");
    } catch {
      return new Response(JSON.stringify({ error: "returnUrl inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const status = msg === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
