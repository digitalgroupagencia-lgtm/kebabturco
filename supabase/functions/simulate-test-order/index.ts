// Edge function: cria um pedido de teste (is_test=true) replicando todo o fluxo operacional.
// Apenas admin_master pode chamar.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  storeId: string;
  mode: "dine_in" | "takeaway" | "delivery";
  tableId?: string;
  tableNumber?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin_master" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden, admin_master only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!body.storeId || !body.mode) {
      return new Response(JSON.stringify({ error: "storeId e mode são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pega 1-2 produtos activos da loja (ou cria fallback)
    const { data: products } = await admin
      .from("products")
      .select("id, name, price")
      .eq("store_id", body.storeId)
      .eq("is_active", true)
      .limit(2);

    const resolveName = (n: unknown): string => {
      if (typeof n === "string") {
        const t = n.trim();
        if (t.startsWith("{") && t.endsWith("}")) {
          try { return resolveName(JSON.parse(t)); } catch { return t; }
        }
        return t;
      }
      if (n && typeof n === "object") {
        const o = n as Record<string, unknown>;
        const v = o.es || o.en || o.pt || Object.values(o)[0];
        return typeof v === "string" ? v : String(v ?? "");
      }
      return String(n ?? "");
    };
    const items = (products && products.length > 0)
      ? products.map((p) => ({ product_id: p.id, product_name: resolveName(p.name), quantity: 1, unit_price: Number(p.price) || 0, total_price: Number(p.price) || 0 }))
      : [{ product_id: null, product_name: "[TESTE] Item de teste", quantity: 1, unit_price: 1.00, total_price: 1.00 }];

    const subtotal = items.reduce((s, it) => s + it.total_price, 0);

    // Próximo nº de pedido
    const { data: orderNum } = await admin.rpc("next_order_number", { _store_id: body.storeId });

    const orderPayload: Record<string, unknown> = {
      store_id: body.storeId,
      order_number: orderNum || `T${Date.now().toString().slice(-4)}`,
      source: "totem",
      status: "pending",
      order_type: body.mode,
      subtotal,
      total: subtotal,
      payment_method: "card",
      payment_status: "paid",
      customer_name: "[TESTE] Cliente",
      notes: "[TESTE] Pedido de teste do sistema.",
      is_test: true,
    };

    if (body.mode === "dine_in") {
      orderPayload.table_number = body.tableNumber || "T1";
      orderPayload.table_validated = true;
    }
    if (body.mode === "delivery") {
      orderPayload.customer_phone = "000000000";
      orderPayload.delivery_street = "Rua Teste";
      orderPayload.delivery_number = "123";
      orderPayload.delivery_city = "Cidade Teste";
      orderPayload.delivery_postal_code = "00000-000";
      orderPayload.delivery_fee = 0;
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number")
      .single();

    if (orderErr) {
      return new Response(JSON.stringify({ error: orderErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insere items
    const itemRows = items.map((it) => ({ ...it, order_id: order.id }));
    await admin.from("order_items").insert(itemRows);

    return new Response(JSON.stringify({ success: true, orderId: order.id, orderNumber: order.order_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
