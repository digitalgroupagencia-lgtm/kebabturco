import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKETING_PHONE_TAG = "__marketing__";

type CampaignRow = {
  id: string;
  store_id: string;
  name: string;
  message_template: string;
  trigger_days: number | null;
  trigger_event: string | null;
  title: string | null;
  push_url: string | null;
  is_active: boolean;
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
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    payload,
  );
}

function dayWindow(daysAgo: number): { start: string; end: string } {
  const now = new Date();
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() - daysAgo);
  target.setUTCHours(0, 0, 0, 0);
  const start = new Date(target);
  const end = new Date(target);
  end.setUTCHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const storeIdFilter = body.storeId as string | undefined;
    const campaignIdFilter = body.campaignId as string | undefined;
    const dryRun = Boolean(body.dryRun ?? body.simulate);
    const cronRun = Boolean(body.cron);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

    let campaignQuery = supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_event", "first_order");

    if (storeIdFilter) campaignQuery = campaignQuery.eq("store_id", storeIdFilter);
    if (campaignIdFilter) campaignQuery = campaignQuery.eq("id", campaignIdFilter);

    const { data: campaigns, error: campErr } = await campaignQuery;
    if (campErr) {
      return new Response(JSON.stringify({ error: campErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const campaign of (campaigns ?? []) as CampaignRow[]) {
      const days = campaign.trigger_days ?? 30;
      if (!days || days < 1) continue;

      const { start, end } = dayWindow(days);

      const { data: firstOrders, error: foErr } = await supabase
        .from("customer_first_orders")
        .select("store_id, customer_phone, first_order_at")
        .eq("store_id", campaign.store_id)
        .gte("first_order_at", start)
        .lte("first_order_at", end);

      if (foErr) {
        results.push({ campaignId: campaign.id, error: foErr.message });
        continue;
      }

      for (const row of firstOrders ?? []) {
        const phone = row.customer_phone as string;

        const { data: existingLog } = await supabase
          .from("campaign_send_log")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("customer_phone", phone)
          .eq("status", "sent")
          .maybeSingle();

        if (existingLog) {
          totalSkipped++;
          continue;
        }

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("store_id", campaign.store_id)
          .eq("customer_phone", MARKETING_PHONE_TAG);

        if (!subs?.length) {
          if (!dryRun) {
            await supabase.from("campaign_send_log").insert({
              store_id: campaign.store_id,
              campaign_id: campaign.id,
              customer_phone: phone,
              status: "skipped",
              error_message: "Sem subscrição push marketing",
            });
          }
          totalSkipped++;
          results.push({ campaignId: campaign.id, phone, status: "skipped", reason: "no_push" });
          continue;
        }

        const title = campaign.title ?? campaign.name;
        const msgBody = campaign.message_template;
        const pushUrl = campaign.push_url ?? "/";
        const payload = JSON.stringify({
          title,
          body: msgBody,
          tag: `campaign-${campaign.id}`,
          url: pushUrl,
        });

        if (dryRun) {
          totalSent++;
          results.push({ campaignId: campaign.id, phone, status: "dry_run", title });
          if (!cronRun) {
            await supabase.from("campaign_send_log").insert({
              store_id: campaign.store_id,
              campaign_id: campaign.id,
              customer_phone: phone,
              status: "dry_run",
            });
          }
          continue;
        }

        if (!vapidPublic || !vapidPrivate) {
          return new Response(JSON.stringify({ skipped: true, reason: "VAPID not configured" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let sentForPhone = false;
        let lastError: string | null = null;

        for (const sub of subs) {
          try {
            await sendWebPush(sub, payload, vapidPublic, vapidPrivate);
            sentForPhone = true;
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }

        if (sentForPhone) {
          totalSent++;
          await supabase.from("campaign_send_log").insert({
            store_id: campaign.store_id,
            campaign_id: campaign.id,
            customer_phone: phone,
            status: "sent",
          });
          results.push({ campaignId: campaign.id, phone, status: "sent" });
        } else {
          totalFailed++;
          await supabase.from("campaign_send_log").insert({
            store_id: campaign.store_id,
            campaign_id: campaign.id,
            customer_phone: phone,
            status: "failed",
            error_message: lastError,
          });
          results.push({ campaignId: campaign.id, phone, status: "failed", error: lastError });
        }
      }

      if (!dryRun) {
        await supabase
          .from("marketing_campaigns")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", campaign.id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dryRun,
        campaignsProcessed: (campaigns ?? []).length,
        sent: totalSent,
        skipped: totalSkipped,
        failed: totalFailed,
        results: results.slice(0, 50),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
