import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
) {
  // Minimal Web Push via fetch to push service (uses web-push protocol)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, title, body, tag, url } = await req.json();
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ skipped: true, reason: "VAPID not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
    if (orderId) query = query.eq("order_id", orderId);
    const { data: subs } = await query;

    const payload = JSON.stringify({ title, body, tag, url });
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
