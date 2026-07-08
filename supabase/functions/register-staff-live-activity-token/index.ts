import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const storeId = String(body.store_id ?? "").trim();
    const orderId = String(body.order_id ?? "").trim();
    const token = String(body.push_to_start_token ?? body.token ?? "").trim();
    const tokenKind = String(body.token_kind ?? "push_to_start").trim();
    const customerPhone = String(body.customer_phone ?? "").trim();

    if (!token || (!storeId && !orderId)) {
      return new Response(JSON.stringify({ error: "token e store_id ou order_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    if (tokenKind === "customer_push_to_start" && orderId) {
      const { data: order } = await admin
        .from("orders")
        .select("id, store_id, customer_phone")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (customerPhone && order.customer_phone && order.customer_phone !== customerPhone) {
        return new Response(JSON.stringify({ error: "Telefone não corresponde ao pedido" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin
        .from("staff_live_activity_tokens")
        .delete()
        .eq("order_id", orderId)
        .eq("token_kind", tokenKind);

      const { error } = await admin.from("staff_live_activity_tokens").insert({
        store_id: order.store_id,
        order_id: orderId,
        customer_phone: order.customer_phone,
        token_kind: tokenKind,
        token_value: token,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt || !storeId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: canAccess } = await userClient.rpc("user_can_access_store", { _store_id: storeId });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("staff_live_activity_tokens")
      .delete()
      .eq("store_id", storeId)
      .eq("user_id", userData.user.id)
      .eq("token_kind", tokenKind);

    const { error } = await admin.from("staff_live_activity_tokens").insert({
      store_id: storeId,
      user_id: userData.user.id,
      token_kind: tokenKind,
      token_value: token,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[register-staff-live-activity-token]", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
