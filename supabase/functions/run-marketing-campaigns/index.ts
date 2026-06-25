import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyTemplate,
  buildVars,
  isQuietHours,
  isStoreOpen,
  normalizeLocale,
  pickI18n,
  pickLocalized,
  resolveLocaleFromMode,
  type MessageLocale,
} from "../_shared/campaignTemplateEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKETING_PHONE_TAG = "__marketing__";
const STAMPS_NEEDED = 10;

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
  language_mode: string | null;
  quiet_hours_enabled: boolean | null;
  only_when_open: boolean | null;
  audience_type: string | null;
  audience_config: Record<string, unknown> | null;
  schedule_time: string | null;
  schedule_days: number[] | null;
  preset_key: string | null;
  linked_coupon_id: string | null;
  linked_product_id: string | null;
  title_pt?: string | null;
  title_es?: string | null;
  title_en?: string | null;
  message_pt?: string | null;
  message_es?: string | null;
  message_en?: string | null;
};

type StoreContext = {
  name: string;
  tenant_id: string;
  timezone: string;
  weekly_schedule: unknown;
  antiSpamMax: number;
  antiSpamDays: number;
};

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

function dayOfWeekInTz(timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
  const w = fmt.format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
}

function minutesInTz(timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

async function loadStoreContext(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
): Promise<StoreContext | null> {
  const { data: store } = await supabase.from("stores").select("name, tenant_id").eq("id", storeId).maybeSingle();
  if (!store) return null;

  const { data: ops } = await supabase
    .from("operations_settings")
    .select("weekly_schedule, schedule_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  const { data: mkt } = await supabase
    .from("tenant_marketing_settings")
    .select("anti_spam_max_pushes, anti_spam_window_days, push_enabled, auto_campaigns_enabled")
    .eq("tenant_id", store.tenant_id)
    .maybeSingle();

  if (mkt?.push_enabled === false || mkt?.auto_campaigns_enabled === false) return null;

  return {
    name: store.name,
    tenant_id: store.tenant_id,
    timezone: ops?.schedule_timezone ?? "Europe/Madrid",
    weekly_schedule: ops?.weekly_schedule,
    antiSpamMax: mkt?.anti_spam_max_pushes ?? 2,
    antiSpamDays: mkt?.anti_spam_window_days ?? 30,
  };
}

async function passesAntiSpam(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  phone: string,
  max: number,
  days: number,
): Promise<boolean> {
  const { data } = await supabase.rpc("marketing_push_count_recent", {
    _store_id: storeId,
    _customer_phone: phone,
    _window_days: days,
  });
  return (data as number) < max;
}

async function alreadySentCampaign(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  phone: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("campaign_send_log")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("customer_phone", phone)
    .eq("status", "sent")
    .maybeSingle();
  return Boolean(data);
}

async function getCustomerLocale(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  phone: string,
): Promise<MessageLocale> {
  const { data } = await supabase
    .from("customer_last_order_locale")
    .select("order_locale")
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
    .maybeSingle();
  return normalizeLocale(data?.order_locale);
}

async function resolveFeaturedProduct(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  productId: string | null,
  locale: MessageLocale,
) {
  let q = supabase.from("products").select("name, price, category_id").eq("store_id", storeId).eq("is_active", true);
  if (productId) q = q.eq("id", productId);
  else q = q.eq("marketing_featured", true);
  const { data: product } = await q.limit(1).maybeSingle();
  if (!product) return { name: "", price: "", category: "" };

  let category = "";
  if (product.category_id) {
    const { data: cat } = await supabase.from("categories").select("name").eq("id", product.category_id).maybeSingle();
    category = pickI18n(cat?.name, locale);
  }
  return {
    name: pickI18n(product.name, locale),
    price: new Intl.NumberFormat(locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : "es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(Number(product.price)),
    category,
  };
}

async function resolveCoupon(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  couponId: string | null,
  audienceConfig: Record<string, unknown> | null,
) {
  const suggest = audienceConfig?.suggest_coupon as string | undefined;
  let q = supabase.from("coupons").select("code, discount_type, discount_value").eq("store_id", storeId).eq("is_active", true);
  if (couponId) q = q.eq("id", couponId);
  else if (suggest) q = q.ilike("code", suggest);
  const { data } = await q.limit(1).maybeSingle();
  if (!data) return { code: suggest ?? "", discount: "10%" };
  if (data.discount_type === "free_delivery") {
    return { code: data.code, discount: "entrega grátis" };
  }
  if (data.discount_type === "combo_nth") {
    return { code: data.code, discount: `${data.discount_value}% no 3.º` };
  }
  const discount =
    data.discount_type === "percent" ? `${data.discount_value}%` : `${data.discount_value}€`;
  return { code: data.code, discount };
}

async function sendMarketingPush(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  title: string,
  body: string,
  url: string,
  campaignId: string,
  phone: string,
) {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      storeId,
      title,
      body,
      url,
      audience: "marketing",
      tag: `campaign-${campaignId}`,
      customerPhone: phone !== MARKETING_PHONE_TAG ? phone : undefined,
      marketingBroadcast: phone === MARKETING_PHONE_TAG,
    },
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { sent?: number; skipped?: boolean; reason?: string; error?: string };
  if (payload.error) return { ok: false, error: payload.error };
  if (payload.skipped) return { ok: false, error: payload.reason ?? "skipped" };
  return { ok: (payload.sent ?? 0) > 0 };
}

async function audiencePhones(
  supabase: ReturnType<typeof createClient>,
  campaign: CampaignRow,
  ctx: StoreContext,
): Promise<Array<{ phone: string; name?: string | null; stamps?: number }>> {
  const event = campaign.trigger_event ?? "first_order";
  const days = campaign.trigger_days ?? 30;

  if (event === "manual_only") return [];

  if (event === "first_order") {
    const { start, end } = dayWindow(days);
    const { data } = await supabase
      .from("customer_first_orders")
      .select("customer_phone")
      .eq("store_id", campaign.store_id)
      .gte("first_order_at", start)
      .lte("first_order_at", end);
    return (data ?? []).map((r) => ({ phone: r.customer_phone as string }));
  }

  if (event === "inactive") {
    const { start, end } = dayWindow(days);
    const { data } = await supabase
      .from("customer_last_orders")
      .select("customer_phone")
      .eq("store_id", campaign.store_id)
      .gte("last_order_at", start)
      .lte("last_order_at", end);
    return (data ?? []).map((r) => ({ phone: r.customer_phone as string }));
  }

  if (event === "loyalty_threshold") {
    const threshold = Number(campaign.audience_config?.stamps_threshold ?? 8);
    const { data } = await supabase
      .from("loyalty_accounts")
      .select("phone, stamps")
      .eq("store_id", campaign.store_id)
      .gte("stamps", threshold)
      .lt("stamps", STAMPS_NEEDED);
    return (data ?? []).map((r) => ({
      phone: r.phone as string,
      stamps: r.stamps as number,
    }));
  }

  if (event === "new_subscriber") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("customer_phone, created_at")
      .eq("store_id", campaign.store_id)
      .eq("customer_phone", MARKETING_PHONE_TAG)
      .gte("created_at", since);
    if (!data?.length) return [];
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("store_id", campaign.store_id)
      .eq("customer_phone", MARKETING_PHONE_TAG);
    return subs?.length ? [{ phone: MARKETING_PHONE_TAG }] : [];
  }

  if (event === "schedule_cron") {
    const dow = dayOfWeekInTz(ctx.timezone);
    const days = campaign.schedule_days ?? [];
    if (days.length && !days.includes(dow)) return [];
    if (campaign.schedule_time) {
      const [hh, mm] = campaign.schedule_time.split(":").map(Number);
      const target = (hh ?? 0) * 60 + (mm ?? 0);
      const now = minutesInTz(ctx.timezone);
      if (Math.abs(now - target) > 30) return [];
    }
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("store_id", campaign.store_id)
      .eq("customer_phone", MARKETING_PHONE_TAG);
    return data?.length ? [{ phone: MARKETING_PHONE_TAG }] : [];
  }

  if (event === "store_open") {
    const open = isStoreOpen(ctx.weekly_schedule, ctx.timezone);
    if (campaign.preset_key === "closed_soon") {
      if (!open) return [];
    } else if (campaign.only_when_open && !open) {
      return [];
    }
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("store_id", campaign.store_id)
      .eq("customer_phone", MARKETING_PHONE_TAG);
    return data?.length ? [{ phone: MARKETING_PHONE_TAG }] : [];
  }

  // all_subscribers fallback
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("store_id", campaign.store_id)
    .eq("customer_phone", MARKETING_PHONE_TAG);
  return data?.length ? [{ phone: MARKETING_PHONE_TAG }] : [];
}

async function processCampaign(
  supabase: ReturnType<typeof createClient>,
  campaign: CampaignRow,
  ctx: StoreContext,
  dryRun: boolean,
) {
  const results: Array<Record<string, unknown>> = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  if (campaign.quiet_hours_enabled !== false && isQuietHours(ctx.timezone)) {
    return { sent, skipped: 1, failed, results: [{ campaignId: campaign.id, status: "skipped", reason: "quiet_hours" }] };
  }

  if (campaign.only_when_open && !isStoreOpen(ctx.weekly_schedule, ctx.timezone)) {
    return { sent, skipped: 1, failed, results: [{ campaignId: campaign.id, status: "skipped", reason: "store_closed" }] };
  }

  const recipients = await audiencePhones(supabase, campaign, ctx);
  const featuredCache = new Map<MessageLocale, { name: string; price: string; category: string }>();
  const coupon = await resolveCoupon(supabase, campaign.store_id, campaign.linked_coupon_id, campaign.audience_config);

  for (const recipient of recipients) {
    const phone = recipient.phone;

    if (phone !== MARKETING_PHONE_TAG) {
      if (!(await passesAntiSpam(supabase, campaign.store_id, phone, ctx.antiSpamMax, ctx.antiSpamDays))) {
        skipped++;
        results.push({ phone, status: "skipped", reason: "anti_spam" });
        continue;
      }
      if (await alreadySentCampaign(supabase, campaign.id, phone)) {
        skipped++;
        continue;
      }
    }

    const customerLocale = phone === MARKETING_PHONE_TAG ? "es" : await getCustomerLocale(supabase, campaign.store_id, phone);
    const locale = resolveLocaleFromMode(campaign.language_mode, customerLocale);
    if (!featuredCache.has(locale)) {
      featuredCache.set(
        locale,
        await resolveFeaturedProduct(supabase, campaign.store_id, campaign.linked_product_id, locale),
      );
    }
    const featured = featuredCache.get(locale)!;
    const stampsRemaining = recipient.stamps != null ? STAMPS_NEEDED - recipient.stamps : 2;

    const { title: rawTitle, body: rawBody } = pickLocalized(campaign as unknown as Record<string, unknown>, locale);
    const vars = buildVars({
      storeName: ctx.name,
      customerName: null,
      scheduleRaw: ctx.weekly_schedule,
      timezone: ctx.timezone,
      productName: featured.name,
      productPrice: featured.price,
      categoryName: featured.category,
      couponCode: coupon.code,
      couponDiscount: coupon.discount,
      stampsRemaining,
      menuUrl: campaign.push_url ?? "/",
    });
    const title = applyTemplate(rawTitle, vars);
    const body = applyTemplate(rawBody, vars);
    const pushUrl = campaign.push_url ?? "/";

    if (dryRun) {
      sent++;
      results.push({ phone, status: "dry_run", title, locale });
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("store_id", campaign.store_id)
      .or(
        phone === MARKETING_PHONE_TAG
          ? `customer_phone.eq.${MARKETING_PHONE_TAG}`
          : `customer_phone.eq.${phone},customer_phone.eq.${MARKETING_PHONE_TAG}`,
      )
      .limit(1);

    if (!subs?.length) {
      skipped++;
      await supabase.from("campaign_send_log").insert({
        store_id: campaign.store_id,
        campaign_id: campaign.id,
        customer_phone: phone,
        status: "skipped",
        error_message: "Sem subscrição push marketing",
      });
      continue;
    }

    const pushRes = await sendMarketingPush(supabase, campaign.store_id, title, body, pushUrl, campaign.id, phone);
    if (pushRes.ok) {
      sent++;
      await supabase.from("campaign_send_log").insert({
        store_id: campaign.store_id,
        campaign_id: campaign.id,
        customer_phone: phone,
        status: "sent",
        resolved_title: title,
        resolved_body: body,
        message_locale: locale,
      });
      results.push({ phone, status: "sent", title });
    } else {
      failed++;
      await supabase.from("campaign_send_log").insert({
        store_id: campaign.store_id,
        campaign_id: campaign.id,
        customer_phone: phone,
        status: "failed",
        error_message: pushRes.error,
      });
    }
  }

  if (!dryRun && (sent > 0 || recipients.length === 0)) {
    await supabase.from("marketing_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaign.id);
  }

  return { sent, skipped, failed, results };
}

async function processScheduledRuns(supabase: ReturnType<typeof createClient>) {
  const { data: runs } = await supabase
    .from("scheduled_campaign_runs")
    .select("id, campaign_id, store_id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(20);

  for (const run of runs ?? []) {
    await supabase.from("scheduled_campaign_runs").update({ status: "processing" }).eq("id", run.id);
    try {
      const { data: campaign } = await supabase.from("marketing_campaigns").select("*").eq("id", run.campaign_id).maybeSingle();
      if (!campaign?.is_active) {
        await supabase.from("scheduled_campaign_runs").update({ status: "cancelled", processed_at: new Date().toISOString() }).eq("id", run.id);
        continue;
      }
      const ctx = await loadStoreContext(supabase, run.store_id);
      if (!ctx) {
        await supabase.from("scheduled_campaign_runs").update({ status: "failed", error: "marketing disabled", processed_at: new Date().toISOString() }).eq("id", run.id);
        continue;
      }
      await processCampaign(supabase, campaign as CampaignRow, ctx, false);
      await supabase.from("scheduled_campaign_runs").update({ status: "done", processed_at: new Date().toISOString() }).eq("id", run.id);
    } catch (e) {
      await supabase.from("scheduled_campaign_runs").update({
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
        processed_at: new Date().toISOString(),
      }).eq("id", run.id);
    }
  }
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

    if (cronRun) {
      await processScheduledRuns(supabase);
    }

    let campaignQuery = supabase.from("marketing_campaigns").select("*").eq("is_active", true);
    if (storeIdFilter) campaignQuery = campaignQuery.eq("store_id", storeIdFilter);
    if (campaignIdFilter) campaignQuery = campaignQuery.eq("id", campaignIdFilter);
    if (cronRun && !campaignIdFilter) {
      campaignQuery = campaignQuery.neq("trigger_event", "manual_only");
    }

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
      if (campaign.send_mode === "manual") continue;
      const ctx = await loadStoreContext(supabase, campaign.store_id);
      if (!ctx) {
        totalSkipped++;
        continue;
      }
      const out = await processCampaign(supabase, campaign, ctx, dryRun);
      totalSent += out.sent;
      totalSkipped += out.skipped;
      totalFailed += out.failed;
      results.push(...out.results);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dryRun,
        cron: cronRun,
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
