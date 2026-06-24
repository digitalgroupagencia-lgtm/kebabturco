import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-push-secret",
  "Cache-Control": "no-store",
};

const STAFF_PHONE_TAG = "__staff__";
const MARKETING_PHONE_TAG = "__marketing__";

function normalizeNativeToken(raw: string): string {
  return String(raw).replace(/[<>\s]/g, "").toLowerCase();
}

function isInvalidPushTokenError(message: string, status?: number): boolean {
  return (
    status === 403 ||
    status === 404 ||
    status === 410 ||
    /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT|BadDeviceToken|DeviceTokenNotForTopic/i.test(message)
  );
}

async function deleteInvalidSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: PushSubRow,
): Promise<void> {
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const token = sub.fcm_token ?? sub.endpoint.replace(/^fcm:\/\//i, "");
  if (token) {
    await supabase.from("push_subscriptions").delete().eq("fcm_token", normalizeNativeToken(token));
  }
}

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
// APNs HTTP/2 — iPhone nativo (token APNs do Capacitor)
// =============================================================
type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  topic: string;
  useSandbox: boolean;
};

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

function getApnsConfig(): ApnsConfig | null {
  const keyId = (Deno.env.get("APNS_KEY_ID") ?? "").trim();
  const teamId = (Deno.env.get("APNS_TEAM_ID") ?? "").trim();
  const privateKey = (Deno.env.get("APNS_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n").trim();
  const topic = (Deno.env.get("APNS_BUNDLE_ID") ?? "net.kebabturco.app").trim();
  if (!keyId || !teamId || !privateKey.includes("BEGIN PRIVATE KEY")) return null;
  const useSandbox = (Deno.env.get("APNS_USE_SANDBOX") ?? "true").toLowerCase().trim() !== "false";
  return { keyId, teamId, privateKey, topic, useSandbox };
}

async function getApnsJwt(config: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && cachedApnsJwt.expiresAt - 120 > now) {
    return cachedApnsJwt.token;
  }

  const jose = await import("https://deno.land/x/jose@v5.2.0/index.ts");
  const key = await jose.importPKCS8(config.privateKey, "ES256");
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: config.keyId })
    .setIssuer(config.teamId)
    .setIssuedAt(now)
    .sign(key);

  cachedApnsJwt = { token: jwt, expiresAt: now + 3300 };
  return jwt;
}

async function sendApns(
  deviceToken: string,
  payload: { title: string; body: string; tag?: string; url?: string },
  config: ApnsConfig,
  opts?: { tryBothHosts?: boolean },
): Promise<{ host: string }> {
  const token = deviceToken.replace(/[<>\s]/g, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    throw new Error(`APNs token inválido (formato): ${token.slice(0, 16)}…`);
  }

  const jwt = await getApnsJwt(config);
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "interruption-level": "time-sensitive",
    },
    url: payload.url ?? "/",
    tag: payload.tag ?? "",
  });

  const primaryHost = config.useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const alternateHost = config.useSandbox ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const hosts = opts?.tryBothHosts ? [primaryHost, alternateHost] : [primaryHost];

  const attemptErrors: string[] = [];
  for (const host of hosts) {
    const res = await fetch(`https://${host}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": config.topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body,
    });
    if (res.ok) return { host };
    const text = await res.text();
    attemptErrors.push(`${host}: ${res.status} ${text}`);
    if (res.status === 400 && /DeviceTokenNotForTopic/i.test(text)) break;
    if (!opts?.tryBothHosts) break;
    if (res.status === 400 && /BadDeviceToken/i.test(text)) continue;
    if (res.status === 410) break;
  }

  const lastError = attemptErrors[attemptErrors.length - 1] ?? "APNs send failed";
  const err = new Error(`APNs ${lastError}`) as Error & { statusCode?: number; attemptErrors?: string[] };
  err.statusCode = 400;
  err.attemptErrors = attemptErrors;
  throw err;
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

const STAFF_PUSH_ROLES = new Set([
  "admin_master",
  "restaurant_admin",
  "operator",
  "cashier",
  "seller",
]);

async function authorizeStaffBroadcast(
  req: Request,
  body: {
    orderId?: string;
    storeId?: string;
    audience?: string;
    testDirect?: boolean;
    pushDiagnostic?: boolean;
  },
): Promise<boolean> {
  if (!isStaffStoreBroadcast(body)) return true;

  const internalSecret = Deno.env.get("STAFF_PUSH_INTERNAL_SECRET");
  const headerSecret = req.headers.get("x-staff-push-secret");
  if (internalSecret && headerSecret === internalSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && auth.includes(serviceKey)) return true;

  if (!auth.startsWith("Bearer ")) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return false;

  const service = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if ((roles ?? []).some((r) => STAFF_PUSH_ROLES.has(r.role as string))) return true;

  if (body.storeId) {
    const { data: canAccess, error: accessErr } = await userClient.rpc("user_can_access_store", {
      _store_id: body.storeId,
    });
    if (!accessErr && canAccess === true) return true;
  }

  return false;
}

function buildHealthPayload() {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const fcm = getFcmServiceAccount();
  const apns = getApnsConfig();
  return {
    ok: true,
    service: "send-push-notification",
    configured: Boolean(vapidPublic && vapidPrivate),
    hasPublicKey: Boolean(vapidPublic),
    hasPrivateKey: Boolean(vapidPrivate),
    publicKey: vapidPublic || null,
    publicKeyPreview: vapidPublic
      ? `${vapidPublic.slice(0, 12)}…${vapidPublic.slice(-6)}`
      : null,
    fcmConfigured: Boolean(fcm),
    fcmProjectId: fcm?.project_id ?? null,
    apnsConfigured: Boolean(apns),
    apnsTopic: apns?.topic ?? null,
    apnsSandbox: apns?.useSandbox ?? null,
  };
}

function healthProbeResponse() {
  return new Response(JSON.stringify(buildHealthPayload()), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isStaffAudienceRow(row: PushSubRow): boolean {
  if (row.order_id) return false;
  const tag = row.customer_phone;
  return tag == null || tag === "" || tag === STAFF_PHONE_TAG;
}

function isMarketingAudienceRow(row: PushSubRow): boolean {
  return row.customer_phone === MARKETING_PHONE_TAG;
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
  if (req.method === "GET") return healthProbeResponse();

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.probe === true || body?.ping === true || body?.health === true) {
      return healthProbeResponse();
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
      nativeDirectToken,
      nativePlatform,
      requireInteraction,
      pushDiagnostic,
    } = body;

    if (!(await authorizeStaffBroadcast(req, { ...body, pushDiagnostic }))) {
      return new Response(
        JSON.stringify({
          error: "Sem autorização para enviar alertas da equipa. Inicie sessão no painel ou configure o segredo interno.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const fcm = getFcmServiceAccount();
    const apns = getApnsConfig();

    if (!vapidPublic && !fcm && !apns) {
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
    const nativeDirectOnly = Boolean(testDirect && nativeDirectToken && nativePlatform);
    const webDirectOnly = Boolean(
      testDirect &&
        directSubscription?.endpoint &&
        directSubscription?.p256dh &&
        directSubscription?.auth &&
        !nativeDirectToken,
    );
    const directOnly = nativeDirectOnly || webDirectOnly;

    if (!directOnly && (storeId || orderId)) {
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

    if (webDirectOnly) {
      targetMap.set(directSubscription.endpoint, {
        endpoint: directSubscription.endpoint,
        p256dh: directSubscription.p256dh,
        auth: directSubscription.auth,
        platform: "web",
      });
    } else if (!nativeDirectOnly && testDirect && directSubscription?.endpoint && directSubscription?.p256dh && directSubscription?.auth) {
      targetMap.set(directSubscription.endpoint, {
        endpoint: directSubscription.endpoint,
        p256dh: directSubscription.p256dh,
        auth: directSubscription.auth,
        platform: "web",
      });
    }

    if (testDirect && nativeDirectToken && nativePlatform) {
      targetMap.clear();
      const cleanToken = normalizeNativeToken(String(nativeDirectToken));
      const plat = String(nativePlatform).toLowerCase();
      const platform = plat === "ios" || plat === "android" ? plat : "ios";
      targetMap.set(`fcm://${cleanToken}`, {
        endpoint: `fcm://${cleanToken}`,
        fcm_token: cleanToken,
        platform,
      });
    }

    const subs = [...targetMap.values()];
    const payloadJson = JSON.stringify({ title, body: msgBody, tag, url, requireInteraction });

    let sent = 0;
    let sentWeb = 0;
    let sentFcm = 0;
    let sentApns = 0;
    const errors: { endpoint: string; status?: number; message: string; channel: string }[] = [];

    let apnsDeliveryNote: string | undefined;
    const apnsTryBothHosts = Boolean(pushDiagnostic && testDirect && nativeDirectToken);

    for (const sub of subs) {
      const platform = (sub.platform ?? "web").toLowerCase();
      try {
        if (platform === "ios") {
          if (!apns) throw new Error("APNs not configured");
          const token = normalizeNativeToken(sub.fcm_token ?? sub.endpoint.replace(/^fcm:\/\//i, ""));
          const apnsResult = await sendApns(
            token,
            { title, body: msgBody, tag, url, requireInteraction },
            apns,
            { tryBothHosts: apnsTryBothHosts },
          );
          sent++;
          sentApns++;
          const expectedHost = apns.useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
          if (apnsResult.host !== expectedHost) {
            apnsDeliveryNote =
              apnsResult.host === "api.push.apple.com"
                ? "Aviso entregue via ambiente App Store. Na Lovable defina APNS_USE_SANDBOX=false e Publish."
                : "Aviso entregue via ambiente teste. Na Lovable defina APNS_USE_SANDBOX=true e Publish.";
            console.warn("[send-push-notification] APNs entregou no ambiente alternativo", {
              host: apnsResult.host,
              configuredSandbox: apns.useSandbox,
            });
          }
        } else if (platform === "android") {
          if (!fcm) throw new Error("FCM not configured");
          const token = normalizeNativeToken(sub.fcm_token ?? sub.endpoint.replace(/^fcm:\/\//i, ""));
          await sendFcmV1(token, { title, body: msgBody, tag, url, requireInteraction }, fcm);
          sent++;
          sentFcm++;
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
        const err = e as { statusCode?: number; status?: number; body?: string; message?: string; attemptErrors?: string[] };
        const status = err.statusCode ?? err.status;
        const message = err.attemptErrors?.join(" | ") || err.body || err.message || String(e);
        console.error("[send-push-notification] error", {
          endpoint: sub.endpoint.slice(0, 60), platform, status, message,
        });
        errors.push({ endpoint: sub.endpoint.slice(0, 60), status, message, channel: platform });
        if (isInvalidPushTokenError(message, status)) {
          await deleteInvalidSubscription(supabase, sub);
        }
      }
    }

    const failed = errors.length;
    const partial = sent > 0 && failed > 0;

    return new Response(
      JSON.stringify({
        sent,
        sentWeb,
        sentFcm,
        sentApns,
        failed,
        partial,
        matched: matchedInDb,
        targeted: subs.length,
        apnsDeliveryNote,
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
