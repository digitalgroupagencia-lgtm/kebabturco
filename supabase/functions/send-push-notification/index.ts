import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-push-secret",
};

const STAFF_PHONE_TAG = "__staff__";
const MARKETING_PHONE_TAG = "__marketing__";

type PushSubRow = { endpoint: string; p256dh: string; auth: string; order_id?: string | null; customer_phone?: string | null };

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
  testDirect?: boolean;
}): boolean {
  if (body.testDirect) return false;
  return Boolean(body.storeId && !body.orderId && body.audience !== "marketing");
}

function authorizeStaffBroadcast(req: Request, body: { orderId?: string; storeId?: string; audience?: string; testDirect?: boolean }): boolean {
  const internalSecret = Deno.env.get("STAFF_PUSH_INTERNAL_SECRET");
  if (!isStaffStoreBroadcast(body)) return true;

  if (!internalSecret) return true;

  const headerSecret = req.headers.get("x-staff-push-secret");
  if (headerSecret === internalSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && auth.includes(serviceKey)) return true;

  return false;
}

function vapidProbeResponse() {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  return new Response(
    JSON.stringify({
      configured: Boolean(vapidPublic && vapidPrivate),
      hasPublicKey: Boolean(vapidPublic),
      hasPrivateKey: Boolean(vapidPrivate),
      publicKeyPreview: vapidPublic
        ? `${vapidPublic.slice(0, 12)}…${vapidPublic.slice(-6)}`
        : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function isStaffAudienceRow(row: PushSubRow): boolean {
  if (row.order_id) return false;
  const tag = row.customer_phone;
  return tag == null || tag === "" || tag === STAFF_PHONE_TAG;
}

function isMarketingAudienceRow(row: PushSubRow): boolean {
  return row.customer_phone === MARKETING_PHONE_TAG || row.order_id != null;
}

function selectAudienceRows(
  rows: PushSubRow[],
  opts: { orderId?: string; storeId?: string; audience?: string },
): PushSubRow[] {
  if (opts.orderId) {
    return rows.filter((r) => r.order_id === opts.orderId);
  }
  if (opts.audience === "marketing") {
    return rows.filter(isMarketingAudienceRow);
  }
  if (opts.storeId) {
    return rows.filter(isStaffAudienceRow);
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    return vapidProbeResponse();
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.probe === true) {
      return vapidProbeResponse();
    }

    const {
      orderId,
      storeId,
      title,
      body: msgBody,
      tag,
      url,
      audience,
      testDirect,
      directSubscription,
    } = body;

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

    if (!orderId && !storeId && !testDirect) {
      return new Response(JSON.stringify({ error: "orderId ou storeId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const targetMap = new Map<string, PushSubRow>();
    let matchedInDb = 0;

    if (storeId || orderId) {
      let query = supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, order_id, customer_phone");
      if (orderId) {
        query = query.eq("order_id", orderId);
      } else if (storeId) {
        query = query.eq("store_id", storeId);
      }
      const { data: rows } = await query;
      const matched = selectAudienceRows((rows ?? []) as PushSubRow[], { orderId, storeId, audience });
      matchedInDb = matched.length;
      for (const sub of matched) {
        targetMap.set(sub.endpoint, sub);
      }
    }

    if (testDirect && directSubscription?.endpoint && directSubscription?.p256dh && directSubscription?.auth) {
      targetMap.set(directSubscription.endpoint, directSubscription);
    }

    const subs = [...targetMap.values()];

    const payload = JSON.stringify({ title, body: msgBody, tag, url });
    let sent = 0;
    const errors: { endpoint: string; status?: number; message: string }[] = [];

    for (const sub of subs) {
      try {
        await sendWebPush(sub, payload, vapidPublic, vapidPrivate);
        sent++;
      } catch (e: any) {
        const status = e?.statusCode ?? e?.status;
        const message = e?.body || e?.message || String(e);
        console.error("[send-push-notification] webpush error", {
          endpoint: sub.endpoint.slice(0, 60),
          status,
          message,
        });
        errors.push({ endpoint: sub.endpoint.slice(0, 60), status, message });
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, matched: matchedInDb, targeted: subs.length, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
