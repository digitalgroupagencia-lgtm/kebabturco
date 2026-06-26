import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMarketplaceWebhookPayload } from "../_shared/wgmOrderPayload.ts";
import { kebabStatusToWgm } from "../_shared/wgmStatusMap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wgm-sync-secret",
};

type Body = {
  order_id?: string;
  event_type?: string;
  queue_id?: string;
  limit?: number;
  ping?: boolean;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function checkInternalSecret(req: Request): boolean {
  const expected = Deno.env.get("WGM_SYNC_INTERNAL_SECRET")?.trim();
  if (!expected) return true;
  const got = req.headers.get("x-wgm-sync-secret")?.trim();
  return got === expected;
}

async function markQueue(
  supabase: ReturnType<typeof createClient>,
  queueId: string,
  patch: Record<string, unknown>,
) {
  await supabase.from("flow_webhook_queue").update(patch).eq("id", queueId);
}

async function processPaidOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  queueId?: string,
) {
  const apiKey = Deno.env.get("WGM_INTEGRATION_API_KEY")?.trim();
  if (!apiKey) {
    const err = "WGM_INTEGRATION_API_KEY não configurada";
    if (queueId) {
      await markQueue(supabase, queueId, {
        status: "failed",
        last_error: err,
        attempts: 1,
      });
    }
    return { ok: false, error: err };
  }

  const { data: cfg } = await supabase
    .from("wgm_integration_config")
    .select("enabled, marketplace_webhook_url")
    .eq("id", 1)
    .maybeSingle();

  if (!cfg?.enabled) {
    return { ok: false, error: "integration_disabled", skipped: true };
  }

  const { data: existingRef } = await supabase
    .from("wgm_order_refs")
    .select("wgm_order_id, synced_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingRef?.wgm_order_id && existingRef.synced_at) {
    if (queueId) {
      await markQueue(supabase, queueId, {
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      });
    }
    return { ok: true, already_synced: true, wgm_order_id: existingRef.wgm_order_id };
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, customer_name, customer_phone, notes, delivery_street, delivery_number, delivery_complement, delivery_city, delivery_postal_code, delivery_notes, delivery_zone_name, table_number, subtotal, delivery_fee, discount_amount, total, payment_method, payment_status, platform_fee_cents, stripe_fee_cents, net_to_store_cents, stripe_payment_intent_id, status, store_id, is_test",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    const err = orderErr?.message ?? "order_not_found";
    if (queueId) await markQueue(supabase, queueId, { status: "failed", last_error: err, attempts: 1 });
    return { ok: false, error: err };
  }

  if (order.is_test) {
    return { ok: false, error: "test_order_skipped", skipped: true };
  }

  if (order.payment_status !== "paid") {
    return { ok: false, error: "order_not_paid", skipped: true };
  }

  const { data: store } = await supabase
    .from("stores")
    .select("flow_store_id")
    .eq("id", order.store_id)
    .maybeSingle();

  const wgmStoreId = store?.flow_store_id?.trim();
  if (!wgmStoreId) {
    const err = "flow_store_id não configurado para esta unidade";
    if (queueId) await markQueue(supabase, queueId, { status: "failed", last_error: err, attempts: 1 });
    await supabase.from("wgm_order_refs").upsert({
      order_id: orderId,
      store_id: order.store_id,
      last_error: err,
      updated_at: new Date().toISOString(),
    });
    return { ok: false, error: err };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "product_name, size_name, quantity, unit_price, total_price, notes, extras, removed, selections, configuration",
    )
    .eq("order_id", orderId);

  const payload = buildMarketplaceWebhookPayload(order, items ?? [], wgmStoreId);
  const url = cfg.marketplace_webhook_url?.trim() ||
    Deno.env.get("WGM_MARKETPLACE_WEBHOOK_URL")?.trim() ||
    "https://giqqsqauirokzgraqobh.supabase.co/functions/v1/marketplace-webhook";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let parsed: { data?: { order_id?: string; numero?: number }; error?: string } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  if (!resp.ok) {
    const err = parsed.error ?? `HTTP ${resp.status}: ${text.slice(0, 300)}`;
    if (queueId) {
      await markQueue(supabase, queueId, {
        status: "failed",
        last_error: err,
        attempts: 1,
      });
    }
    await supabase.from("wgm_order_refs").upsert({
      order_id: orderId,
      store_id: order.store_id,
      last_error: err,
      updated_at: new Date().toISOString(),
    });
    return { ok: false, error: err };
  }

  const wgmOrderId = parsed.data?.order_id ?? null;
  const wgmNumero = parsed.data?.numero ?? null;
  const now = new Date().toISOString();

  await supabase.from("wgm_order_refs").upsert({
    order_id: orderId,
    wgm_order_id: wgmOrderId,
    wgm_order_numero: wgmNumero,
    store_id: order.store_id,
    synced_at: now,
    last_error: null,
    updated_at: now,
  });

  if (queueId) {
    await markQueue(supabase, queueId, {
      status: "sent",
      sent_at: now,
      last_error: null,
      attempts: 1,
    });
  }

  return { ok: true, wgm_order_id: wgmOrderId, numero: wgmNumero };
}

async function processStatusOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  queueId?: string,
) {
  const apiKey = Deno.env.get("WGM_INTEGRATION_API_KEY")?.trim();
  if (!apiKey) {
    return { ok: false, error: "WGM_INTEGRATION_API_KEY não configurada" };
  }

  const { data: cfg } = await supabase
    .from("wgm_integration_config")
    .select("enabled, public_api_url")
    .eq("id", 1)
    .maybeSingle();

  if (!cfg?.enabled) {
    return { ok: false, error: "integration_disabled", skipped: true };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, is_test")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.is_test) {
    return { ok: false, error: "order_not_found_or_test", skipped: true };
  }

  const { data: ref } = await supabase
    .from("wgm_order_refs")
    .select("wgm_order_id, last_status_synced")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!ref?.wgm_order_id) {
    return { ok: false, error: "wgm_order_not_linked", skipped: true };
  }

  const wgmStatus = kebabStatusToWgm(order.status);
  if (ref.last_status_synced === order.status) {
    if (queueId) {
      await markQueue(supabase, queueId, { status: "sent", sent_at: new Date().toISOString() });
    }
    return { ok: true, skipped: true, reason: "already_synced" };
  }

  const baseUrl = cfg.public_api_url?.trim() ||
    Deno.env.get("WGM_PUBLIC_API_URL")?.trim() ||
    "https://giqqsqauirokzgraqobh.supabase.co/functions/v1/public-api";

  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/orders`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      order_id: ref.wgm_order_id,
      status: wgmStatus,
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    const err = `HTTP ${resp.status}: ${text.slice(0, 300)}`;
    if (queueId) await markQueue(supabase, queueId, { status: "failed", last_error: err, attempts: 1 });
    return { ok: false, error: err };
  }

  await supabase.from("wgm_order_refs").update({
    last_status_synced: order.status,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("order_id", orderId);

  if (queueId) {
    await markQueue(supabase, queueId, { status: "sent", sent_at: new Date().toISOString() });
  }

  return { ok: true, wgm_status: wgmStatus };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    return json({ ok: true, service: "wgm-sync-dispatch" });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!checkInternalSecret(req)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const body = (await req.json().catch(() => ({}))) as Body;

  if (body.ping) {
    const hasKey = Boolean(Deno.env.get("WGM_INTEGRATION_API_KEY")?.trim());
    const { data: cfg } = await supabase.from("wgm_integration_config").select("enabled").eq("id", 1).maybeSingle();
    return json({ ok: true, api_key_configured: hasKey, enabled: cfg?.enabled ?? false });
  }

  const results: unknown[] = [];

  if (body.queue_id || body.order_id) {
    const orderId = body.order_id;
    let eventType = body.event_type ?? "order.paid";
    let queueId = body.queue_id;

    if (queueId && !orderId) {
      const { data: row } = await supabase
        .from("flow_webhook_queue")
        .select("order_id, event_type")
        .eq("id", queueId)
        .maybeSingle();
      if (!row) return json({ ok: false, error: "queue_not_found" }, 404);
      eventType = row.event_type;
      const result = eventType === "order.status"
        ? await processStatusOrder(supabase, row.order_id, queueId)
        : await processPaidOrder(supabase, row.order_id, queueId);
      return json({ ok: true, results: [result] });
    }

    if (!orderId) return json({ ok: false, error: "order_id_required" }, 400);

    const result = eventType === "order.status"
      ? await processStatusOrder(supabase, orderId, queueId)
      : await processPaidOrder(supabase, orderId, queueId);
    return json({ ok: true, results: [result] });
  }

  const limit = Math.min(Math.max(body.limit ?? 10, 1), 50);
  const { data: pending } = await supabase
    .from("flow_webhook_queue")
    .select("id, order_id, event_type, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const row of pending ?? []) {
    const result = row.event_type === "order.status"
      ? await processStatusOrder(supabase, row.order_id, row.id)
      : await processPaidOrder(supabase, row.order_id, row.id);
    results.push({ queue_id: row.id, ...result as object });
  }

  return json({ ok: true, processed: results.length, results });
});
