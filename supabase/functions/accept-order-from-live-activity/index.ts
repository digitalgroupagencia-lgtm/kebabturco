import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyLiveActivityAcceptToken } from "../_shared/liveActivityAcceptToken.ts";
import { dispatchStaffLiveActivityEnd } from "../_shared/liveActivityApns.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isAwaitingCounterPayment(order: {
  payment_status: string | null;
  order_type: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
}): boolean {
  if (order.payment_status === "paid") return false;
  const online = new Set(["card", "bizum", "apple_pay", "google_pay", "pix"]);
  if (order.payment_method && online.has(order.payment_method)) return false;
  if (order.stripe_payment_intent_id) return false;
  if (order.order_type === "dine_in") return false;
  return order.order_type === "takeaway" || order.order_type === "delivery";
}

function orderReadyForKitchen(order: {
  payment_status: string | null;
  order_type: string | null;
  table_validated: boolean | null;
}): boolean {
  if (order.payment_status === "paid") return true;
  if (order.order_type === "dine_in" && order.table_validated) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "").trim();
    const storeId = String(body.store_id ?? "").trim();
    const acceptToken = String(body.accept_token ?? "").trim();
    const source = String(body.source ?? "unknown").trim();
    let prepMinutes = Number(body.prep_minutes ?? 15);
    if (!Number.isFinite(prepMinutes)) prepMinutes = 15;
    prepMinutes = Math.min(180, Math.max(5, Math.round(prepMinutes)));

    console.log("[accept-order-from-live-activity] request", {
      orderId, storeId, source, tokenLen: acceptToken.length, prepMinutes,
    });

    if (!orderId || !storeId || !acceptToken) {
      return new Response(JSON.stringify({ error: "Parâmetros em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyLiveActivityAcceptToken(acceptToken);
    if (!payload || payload.order_id !== orderId || payload.store_id !== storeId) {
      console.warn("[accept-order-from-live-activity] token inválido", {
        orderId, storeId, hasPayload: !!payload,
        payloadOrder: payload?.order_id, payloadStore: payload?.store_id,
      });
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: order, error: fetchError } = await admin
      .from("orders")
      .select(
        "id, store_id, status, payment_status, order_type, payment_method, stripe_payment_intent_id, table_validated, order_number",
      )
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (fetchError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      // Já foi aceite/tratado noutro sítio — encerra qualquer Live Activity órfã e responde OK.
      try {
        await dispatchStaffLiveActivityEnd({ admin, storeId, orderId });
      } catch (e) {
        console.warn("[accept-order-from-live-activity] end dispatch (already handled) falhou", String(e));
      }
      return new Response(
        JSON.stringify({
          success: true,
          already_handled: true,
          status: order.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (isAwaitingCounterPayment(order)) {
      return new Response(
        JSON.stringify({
          error: "Confirme o pagamento no balcão antes de aceitar",
          code: "payment_required",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!orderReadyForKitchen(order)) {
      return new Response(
        JSON.stringify({ error: "Pedido ainda não pode ir para cozinha", code: "not_ready" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + prepMinutes);
    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("orders")
      .update({
        status: "preparing",
        estimated_ready_at: eta.toISOString(),
        accepted_by_user_id: payload.user_id,
        accepted_by_name: payload.user_name,
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("store_id", storeId)
      .eq("status", "pending")
      .select("id, status, order_number, estimated_ready_at, accepted_by_name")
      .maybeSingle();

    if (updateError) {
      console.error("[accept-order-from-live-activity] update failed", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Pedido já foi aceite por outra pessoa", already_handled: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, order: updated, prep_minutes: prepMinutes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[accept-order-from-live-activity]", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
