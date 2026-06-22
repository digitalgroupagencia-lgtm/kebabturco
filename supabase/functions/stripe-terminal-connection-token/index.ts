import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import {
  pickStripeSecretForEnvironment,
} from "../_shared/stripeEnv.ts";
import {
  loadStoreConnectPaymentRow,
  resolveStoreConnectEnvironment,
} from "../_shared/stripeStoreConnect.ts";
import { verifyTerminalLocationForStore } from "../_shared/stripeTerminalLocation.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const storeId = typeof body?.storeId === "string" ? body.storeId : null;
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const stripeAccountParam =
      typeof body?.stripeAccount === "string" ? body.stripeAccount.trim() : "";
    if (!storeId) {
      return json({ error: "storeId é obrigatório" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      ["admin_master", "restaurant_admin", "operator", "cashier", "seller"].includes(r.role as string),
    );
    if (!allowed) {
      return json({ error: "Sem permissão" }, 403);
    }

    if (action === "verifyLocation") {
      const outcome = await verifyTerminalLocationForStore(service, storeId);
      return json(outcome, outcome.ok ? 200 : 404);
    }

    const loaded = await loadStoreConnectPaymentRow(service, storeId);
    const store = loaded.store;
    if (!store?.stripe_connect_account_id || !store.stripe_charges_enabled) {
      return json({ error: "Recebimentos Stripe ainda não activos para esta loja" }, 400);
    }

    const connectAccountId = store.stripe_connect_account_id.trim();
    if (!connectAccountId || connectAccountId.startsWith("simulated-")) {
      return json({ error: "Conta Stripe Connect inválida para Terminal" }, 400);
    }

    if (stripeAccountParam && stripeAccountParam !== connectAccountId) {
      return json({ error: "stripeAccount não corresponde à loja indicada" }, 400);
    }

    const connectEnv = await resolveStoreConnectEnvironment(store);
    const stripeKey = pickStripeSecretForEnvironment(
      connectEnv === "test" || store.stripe_connect_test_simulated ? "test" : connectEnv,
    );
    if (!stripeKey) {
      return json({ error: "Stripe não configurada no servidor" }, 503);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const connectionToken = await stripe.terminal.connectionTokens.create(
      {},
      { stripeAccount: connectAccountId },
    );

    return json({
      secret: connectionToken.secret,
      stripeConnectAccountId: connectAccountId,
      stripeTerminalLocationId: store.stripe_terminal_location_id ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar token Terminal";
    return json({ error: msg }, 500);
  }
});
