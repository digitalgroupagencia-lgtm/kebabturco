import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-push-secret",
  "Cache-Control": "no-store",
};

const STAFF_PHONE_TAG = "__staff__";
const MARKETING_PHONE_TAG = "__marketing__";

type PushSubRow = {
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  order_id?: string | null;
  customer_phone?: string | null;
  platform?: string | null;
  fcm_token?: string | null;
};

// =============================================================
// Web Push (VAPID) — navegador / PWA
// =============================================================
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

// =============================================================
// FCM HTTP v1 — Android nativo (Capacitor)
// =============================================================
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getFcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
    return cachedAccessToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  if (!res.ok) {
    throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

async function sendFcmV1(
  token: string,
  payload: { title: string; body: string; tag?: string; url?: string; requireInteraction?: boolean },
  serviceAccount: { project_id: string; client_email: string; private_key: string; token_uri?: string },
): Promise<void> {
  const access = await getFcmAccessToken(serviceAccount);
  const body = {
    message: {
      token,
      data: {
        url: payload.url ?? "/",
        tag: payload.tag ?? "",
      },
      notification: { title: payload.title, body: payload.body },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "staff_orders",
          sound: "default",
          default_vibrate_timings: true,
          visibility: "PUBLIC",
          notification_priority: "PRIORITY_MAX",
          tag: payload.tag,
        },
      },
      apns: {
        payload: {
          aps: { sound: "default", "interruption-level": "time-sensitive" },
        },
        headers: { "apns-priority": "10" },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`FCM send failed: ${res.status} ${text}`) as Error & { statusCode?: number };
    err.statusCode = res.status;
    throw err;
  }
}

function getFcmServiceAccount(): {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
} | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (sa.project_id && sa.client_email && sa.private_key) return sa;
    return null;
  } catch {
    return null;
  }
}

// =============================================================
// Auditoria / autorização
// =============================================================
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
  const fcm = getFcmServiceAccount();
  return new Response(
    JSON.stringify({
      configured: Boolean(vapidPublic && vapidPrivate),
      hasPublicKey: Boolean(vapidPublic),
      hasPrivateKey: Boolean(vapidPrivate),
      publicKey: vapidPublic || null,
      publicKeyPreview: vapidPublic
        ? `${vapidPublic.slice(0, 12)}…${vapidPublic.slice(-6)}`
        : null,
      fcmConfigured: Boolean(fcm),
      fcmProjectId: fcm?.project_id ?? null,
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
  if (opts.orderId) return rows.filter((r) => r.order_id === opts.orderId);
  if (opts.audience === "marketing") return rows.filter(isMarketingAudienceRow);
  if (opts.storeId) return rows.filter(isStaffAudienceRow);
  return [];
}

// =============================================================
// Handler
// =============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return vapidProbeResponse();

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.probe === true) return vapidProbeResponse();

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
      requireInteraction,
    } = body;

    if (!authorizeStaffBroadcast(req, body)) {
      return new Response(JSON.stringify({ error: "Unauthorized staff push" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const fcm = getFcmServiceAccount();

    if (!vapidPublic && !fcm) {
      return new Response(JSON.stringify({ skipped: true, reason: "No push provider configured" }), {
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
        .select("endpoint, p256dh, auth, order_id, customer_phone, platform, fcm_token");
      if (orderId) query = query.eq("order_id", orderId);
      else if (storeId) query = query.eq("store_id", storeId);
      const { data: rows } = await query;
      const matched = selectAudienceRows((rows ?? []) as PushSubRow[], { orderId, storeId, audience });
      matchedInDb = matched.length;
      for (const sub of matched) targetMap.set(sub.endpoint, sub);
    }

    if (testDirect && directSubscription?.endpoint && directSubscription?.p256dh && directSubscription?.auth) {
      targetMap.set(directSubscription.endpoint, {
        endpoint: directSubscription.endpoint,
        p256dh: directSubscription.p256dh,
        auth: directSubscription.auth,
        platform: "web",
      });
    }

    const subs = [...targetMap.values()];
    const payloadJson = JSON.stringify({ title, body: msgBody, tag, url, requireInteraction });

    let sent = 0;
    let sentWeb = 0;
    let sentFcm = 0;
    const errors: { endpoint: string; status?: number; message: string; channel: string }[] = [];

    for (const sub of subs) {
      const platform = (sub.platform ?? "web").toLowerCase();
      try {
        if (platform === "android" || platform === "ios") {
          if (!fcm) throw new Error("FCM not configured");
          const token = sub.fcm_token ?? sub.endpoint.replace(/^fcm:\/\//, "");
          await sendFcmV1(token, { title, body: msgBody, tag, url, requireInteraction }, fcm);
          sent++; sentFcm++;
        } else {
          if (!vapidPublic || !vapidPrivate) throw new Error("VAPID not configured");
          if (!sub.p256dh || !sub.auth) throw new Error("Incomplete VAPID keys");
          await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payloadJson,
            vapidPublic,
            vapidPrivate,
          );
          sent++; sentWeb++;
        }
      } catch (e: unknown) {
        const err = e as { statusCode?: number; status?: number; body?: string; message?: string };
        const status = err.statusCode ?? err.status;
        const message = err.body || err.message || String(e);
        console.error("[send-push-notification] error", {
          endpoint: sub.endpoint.slice(0, 60), platform, status, message,
        });
        errors.push({ endpoint: sub.endpoint.slice(0, 60), status, message, channel: platform });
        // Token inválido -> remover
        if (status === 403 || status === 404 || status === 410 || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/i.test(message)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        sentWeb,
        sentFcm,
        matched: matchedInDb,
        targeted: subs.length,
        errors: errors.length ? errors : undefined,
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
