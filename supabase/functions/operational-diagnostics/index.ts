import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleStaffCreateMember,
  handleStaffUpdateMember,
  handleStaffAuditPing,
} from "../_shared/staffMemberActions.ts";

const corsHeaders = {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Permite "ping" anónimo para sondas de saúde (rpcProbeUtils/backendReadinessProbe)
    // sem disparar 401 ruidoso quando o utilizador está deslogado.
    const earlyBody = req.method === "POST" ? await req.clone().json().catch(() => ({})) : {};
    if (earlyBody && (earlyBody.ping === true || earlyBody.probe === true)) {
      return new Response(
        JSON.stringify({ ok: true, service: "operational-diagnostics" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roles ?? []).some((r) =>
      ["admin_master", "restaurant_admin", "operator"].includes(r.role as string)
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (body?.action === "staff_update_member") {
      return handleStaffUpdateMember(req, body);
    }

    if (body?.action === "staff_audit_ping") {
      return handleStaffAuditPing(req, body);
    }

    if (body?.action === "staff_create_member") {
      return handleStaffCreateMember(req, body);
    }

    const storeId = typeof body.storeId === "string" ? body.storeId : null;

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

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
        console.error("[operational-diagnostics] stripe webhooks", e);
      }
    }

    return new Response(
      JSON.stringify({
        stripeSecretKey: Boolean(stripeSecret),
        stripeWebhookSecret: Boolean(webhookSecret),
        webhookConfigured,
        webhookUrl,
        webhookExpectedUrl: expectedWebhookUrl,
        webhookEvents,
        edgeFunctions: functions,
        store: storeProfile,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[operational-diagnostics]", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
