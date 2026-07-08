import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { issueLiveActivityAcceptToken } from "../_shared/liveActivityAcceptToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "").trim();
    const storeId = String(body.store_id ?? "").trim();
    if (!orderId || !storeId) {
      return new Response(JSON.stringify({ error: "order_id e store_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, store_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.store_id !== storeId) {
      return new Response(JSON.stringify({ error: "Loja incorrecta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess } = await userClient.rpc("user_can_access_store", {
      _store_id: storeId,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Sem permissão para esta loja" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userName =
      (userData.user.user_metadata?.full_name as string | undefined)?.trim() ||
      userData.user.email ||
      "Operador";
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (prof?.full_name) userName = String(prof.full_name);

    const token = await issueLiveActivityAcceptToken({
      order_id: orderId,
      store_id: storeId,
      user_id: userData.user.id,
      user_name: userName,
    });

    const acceptUrl = `${supabaseUrl}/functions/v1/accept-order-from-live-activity`;

    return new Response(JSON.stringify({ token, accept_url: acceptUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[issue-live-activity-accept-token]", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
