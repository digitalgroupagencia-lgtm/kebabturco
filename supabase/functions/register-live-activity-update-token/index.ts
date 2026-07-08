import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const activityId = String(body.activity_id ?? body.activityId ?? body.id ?? "").trim();
    const orderId = String(body.order_id ?? body.orderId ?? activityId.replace(/^customer-/, "")).trim();
    const token = String(body.token ?? "").trim();
    const storeId = String(body.store_id ?? "").trim();

    if (!activityId || !token) {
      return new Response(JSON.stringify({ error: "activity_id e token são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    let resolvedStoreId = storeId;
    if (!resolvedStoreId && orderId) {
      const { data: order } = await admin.from("orders").select("store_id").eq("id", orderId).maybeSingle();
      resolvedStoreId = String(order?.store_id ?? "");
    }

    await admin
      .from("staff_live_activity_tokens")
      .delete()
      .eq("activity_id", activityId)
      .eq("token_kind", "activity_update");

    const row = {
      store_id: resolvedStoreId || null,
      order_id: orderId || null,
      activity_id: activityId,
      token_kind: "activity_update",
      token_value: token,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("staff_live_activity_tokens").insert(row);

    if (error?.code === "23505") {
      const { error: updateError } = await admin
        .from("staff_live_activity_tokens")
        .update({
          store_id: row.store_id,
          order_id: row.order_id,
          token_value: row.token_value,
          updated_at: row.updated_at,
        })
        .eq("activity_id", activityId)
        .eq("token_kind", "activity_update");
      if (updateError) {
        console.error("[register-live-activity-update-token] update failed", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[register-live-activity-update-token] actualizado", {
        activityId,
        orderId,
        storeId: resolvedStoreId,
        tokenLen: token.length,
      });
      return new Response(JSON.stringify({ success: true, updated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (error) {
      console.error("[register-live-activity-update-token]", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[register-live-activity-update-token] registado", {
      activityId,
      orderId,
      storeId: resolvedStoreId,
      tokenLen: token.length,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[register-live-activity-update-token]", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
