import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-push-secret",
};

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
) {
  const webpush = await import("https://esm.sh/web-push@3.6.7");
  webpush.setVapidDetails("mailto:support@kebabturco.net", vapidPublic, vapidPrivate);
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload,
  );
}

function isStaffStoreBroadcast(body: {
  orderId?: string;
  storeId?: string;
  audience?: string;
}): boolean {
  return Boolean(body.storeId && !body.orderId && body.audience !== "marketing");
}

function authorizeStaffBroadcast(req: Request, body: { orderId?: string; storeId?: string; audience?: string }): boolean {
  const internalSecret = Deno.env.get("STAFF_PUSH_INTERNAL_SECRET");
  if (!isStaffStoreBroadcast(body)) return true;

  if (!internalSecret) {
    // Legacy: permitir se ainda não configuraram secret (migrar produção)
    return true;
  }

  const headerSecret = req.headers.get("x-staff-push-secret");
  if (headerSecret === internalSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && auth.includes(serviceKey)) return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { orderId, storeId, title, body: msgBody, tag, url, audience } = body;

    if (!authorizeStaffBroadcast(req, body)) {
      return new Response(JSON.stringify({ error: "Unauthorized staff push" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ skipped: true, reason: "VAPID not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orderId && !storeId) {
      return new Response(JSON.stringify({ error: "orderId ou storeId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
    if (orderId) {
      query = query.eq("order_id", orderId);
    } else if (storeId && audience === "marketing") {
      query = query.eq("store_id", storeId).or(
        'customer_phone.eq."__marketing__",order_id.not.is.null',
      );
    } else if (storeId) {
      query = query.eq("store_id", storeId).is("order_id", null).is("customer_phone", null);
    }
    const { data: subs } = await query;

    const payload = JSON.stringify({ title, body: msgBody, tag, url });
    let sent = 0;

    for (const sub of subs || []) {
      try {
        await sendWebPush(sub, payload, vapidPublic, vapidPrivate);
        sent++;
      } catch {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
