import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyTemplate, buildVars, normalizeLocale, sanitizeNotificationText } from "../_shared/campaignTemplateEngine.ts";
import {
  buildCustomerOrderPush,
  buildCustomerWelcomePush,
  customerOrderPushUrl,
  type CustomerOrderPushContext,
  type CustomerOrderPushEvent,
} from "../_shared/customerOrderPushMessages.ts";
import {
  buildStaffNewOrderPush,
  buildStaffOrderCancelledPush,
  type StaffOrderPushItem,
} from "../_shared/staffOrderPushMessages.ts";
import {
  dispatchCustomerLiveActivityPush,
  dispatchStaffLiveActivityEnd,
  dispatchStaffLiveActivityPushToStart,
  loadLiveActivitySettings,
} from "../_shared/liveActivityApns.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-push-secret",
  "Cache-Control": "no-store",
};

const STAFF_PHONE_TAG = "__staff__";
const MARKETING_PHONE_TAG = "__marketing__";
/** Nome exacto do ficheiro no bundle iOS (mono .caf). */
const STAFF_ORDER_IOS_SOUND = "staff_order_alert.caf";
const STAFF_ORDER_ANDROID_SOUND = "staff_order_alert";

function isStaffOrderPushTag(tag?: string | null): boolean {
  return Boolean(tag && String(tag).startsWith("staff-new-order"));
}

function resolveStaffOrderSound(tag?: string | null): string | undefined {
  return isStaffOrderPushTag(tag) ? STAFF_ORDER_IOS_SOUND : undefined;
}

function normalizeNativeToken(raw: string): string {
  return String(raw).replace(/[<>\s]/g, "").toLowerCase();
}

function isInvalidPushTokenError(message: string, status?: number): boolean {
  return (
    status === 403 ||
    status === 404 ||
    status === 410 ||
    /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT|BadDeviceToken|BadEnvironmentKeyInToken|DeviceTokenNotForTopic/i.test(
      message,
    )
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
  device_locale?: string | null;
  staff_alerts?: boolean | null;
};

type StaffOrderPushContext = {
  orderNumber: string;
  total: number;
  orderType: string | null;
  tableNumber: string | null;
  createdAt: string | null;
  items: StaffOrderPushItem[];
};

async function loadStaffOrderPushContext(
  supabase: ReturnType<typeof createClient>,
  staffOrderId: string,
): Promise<StaffOrderPushContext | null> {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("order_number, total, order_type, table_number, created_at")
    .eq("id", staffOrderId)
    .maybeSingle();
  if (orderErr || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, product_name")
    .eq("order_id", staffOrderId)
    .order("id", { ascending: true });

  return {
    orderNumber: String(order.order_number ?? ""),
    total: Number(order.total) || 0,
    orderType: order.order_type ?? null,
    tableNumber: order.table_number ?? null,
    createdAt: order.created_at ?? null,
    items: (items ?? []).map((row) => ({
      quantity: Number(row.quantity) || 1,
      product_name: String(row.product_name ?? ""),
    })),
  };
}

async function loadCustomerOrderPushContext(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
): Promise<CustomerOrderPushContext | null> {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("order_number, customer_name, order_type, delivery_confirmation_code, store_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return null;

  const { data: store } = await supabase
    .from("stores")
    .select("name, whatsapp_phone, phone")
    .eq("id", order.store_id)
    .maybeSingle();

  return {
    orderNumber: String(order.order_number ?? ""),
    customerName: order.customer_name ?? null,
    storeName: store?.name ?? null,
    whatsappPhone: store?.whatsapp_phone ?? store?.phone ?? null,
    orderType: order.order_type ?? null,
    deliveryCode: order.delivery_confirmation_code ?? null,
  };
}

function resolveCustomerOrderPushText(
  context: CustomerOrderPushContext,
  deviceLocale: string | null | undefined,
  event: CustomerOrderPushEvent,
  fallbackTitle: string,
  fallbackBody: string,
): { title: string; body: string } {
  const built = buildCustomerOrderPush({
    locale: deviceLocale,
    event,
    context,
  });
  return {
    title: built.title || fallbackTitle,
    body: built.body || fallbackBody,
  };
}

function resolveStaffOrderCancelledPushText(
  orderNumber: string,
  cancelledByName: string | null,
  deviceLocale: string | null | undefined,
  fallbackTitle: string,
  fallbackBody: string,
): { title: string; body: string } {
  const built = buildStaffOrderCancelledPush({
    locale: deviceLocale,
    orderNumber,
    cancelledByName,
  });
  return {
    title: built.title || fallbackTitle,
    body: built.body || fallbackBody,
  };
}

function resolveStaffOrderPushText(
  context: StaffOrderPushContext,
  deviceLocale: string | null | undefined,
  fallbackTitle: string,
  fallbackBody: string,
): { title: string; body: string } {
  const built = buildStaffNewOrderPush({
    locale: deviceLocale,
    orderNumber: context.orderNumber,
    total: context.total,
    orderType: context.orderType,
    tableNumber: context.tableNumber,
    items: context.items,
  });
  return {
    title: built.title || fallbackTitle,
    body: built.body || fallbackBody,
  };
}

function resolveMarketingBroadcastPushText(
  deviceLocale: string | null | undefined,
  titleI18n: Record<string, string> | undefined,
  bodyI18n: Record<string, string> | undefined,
  storeName: string,
  fallbackTitle: string,
  fallbackBody: string,
): { title: string; body: string } {
  const locale = normalizeLocale(deviceLocale);
  const rawTitle = titleI18n?.[locale] ?? titleI18n?.es ?? fallbackTitle;
  const rawBody = bodyI18n?.[locale] ?? bodyI18n?.es ?? fallbackBody;
  const vars = buildVars({ storeName });
  return {
    title: sanitizeNotificationText(applyTemplate(rawTitle, vars)),
    body: sanitizeNotificationText(applyTemplate(rawBody, vars)),
  };
}

// =============================================================
// Web Push (VAPID), navegador / PWA
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
// FCM HTTP v1, Android nativo (Capacitor)
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
  payload: {
    title: string;
    body: string;
    tag?: string;
    url?: string;
    imageUrl?: string;
    requireInteraction?: boolean;
    acceptAction?: string;
    ongoing?: boolean;
    accentColor?: string;
    trackLabel?: string;
    openLabel?: string;
  },
  serviceAccount: { project_id: string; client_email: string; private_key: string; token_uri?: string },
): Promise<void> {
  const access = await getFcmAccessToken(serviceAccount);
  const androidSound = isStaffOrderPushTag(payload.tag) ? STAFF_ORDER_ANDROID_SOUND : "default";
  const apnsSound = resolveStaffOrderSound(payload.tag) ?? "default";
  const body = {
    message: {
      token,
      data: {
        url: payload.url ?? "/",
        tag: payload.tag ?? "",
        title: payload.title,
        body: payload.body,
        ongoing: payload.ongoing ? "1" : "0",
        accent_color: payload.accentColor ?? "#3A0205",
        ...(payload.acceptAction ? { action: "accept", accept_url: payload.acceptAction } : {}),
        ...(payload.trackLabel ? { track_label: payload.trackLabel } : {}),
        ...(payload.openLabel ? { open_label: payload.openLabel } : {}),
      },
      notification: { title: payload.title, body: payload.body },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: payload.ongoing ? "order_cards" : "staff_orders",
          sound: androidSound,
          default_vibrate_timings: true,
          visibility: "PUBLIC",
          notification_priority: "PRIORITY_MAX",
          tag: payload.tag,
          sticky: Boolean(payload.ongoing),
          color: payload.accentColor ?? "#3A0205",
          ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
        },
      },
      apns: {
        payload: {
          aps: { sound: apnsSound },
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
// APNs HTTP/2, iPhone nativo (token APNs do Capacitor)
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
  payload: {
    title: string;
    body: string;
    tag?: string;
    url?: string;
    sound?: string;
    imageUrl?: string;
    orderId?: string;
    storeId?: string;
  },
  config: ApnsConfig,
  opts?: { tryBothHosts?: boolean },
): Promise<{ host: string }> {
  const token = deviceToken.replace(/[<>\s]/g, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    throw new Error(`APNs token inválido (formato): ${token.slice(0, 16)}…`);
  }

  const jwt = await getApnsJwt(config);
  const apnsSound =
    payload.sound ?? resolveStaffOrderSound(payload.tag) ?? "default";
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: apnsSound,
      ...(payload.imageUrl ? { "mutable-content": 1 } : {}),
    },
    url: payload.url ?? "/",
    tag: payload.tag ?? "",
    ...(payload.orderId ? { order_id: payload.orderId } : {}),
    ...(payload.storeId ? { store_id: payload.storeId } : {}),
    ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
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
    if (res.status === 403 && /BadEnvironmentKeyInToken/i.test(text)) continue;
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
    staffOrderId?: string;
  },
): Promise<boolean> {
  if (!isStaffStoreBroadcast(body)) return true;

  const internalSecret = Deno.env.get("STAFF_PUSH_INTERNAL_SECRET");
  const headerSecret = req.headers.get("x-staff-push-secret");
  if (internalSecret && headerSecret === internalSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && auth.includes(serviceKey)) return true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  if (body.staffOrderId && body.storeId && serviceKey) {
    try {
      const service = createClient(supabaseUrl, serviceKey);
      const { data: order } = await service
        .from("orders")
        .select("id")
        .eq("id", body.staffOrderId)
        .eq("store_id", body.storeId)
        .maybeSingle();
      if (order?.id) return true;
    } catch (e) {
      console.warn("[send-push-notification] staffOrderId auth check failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const staffOrderCancelledId =
    typeof (body as { staffOrderCancelledId?: string }).staffOrderCancelledId === "string"
      ? (body as { staffOrderCancelledId?: string }).staffOrderCancelledId
      : undefined;
  if (staffOrderCancelledId && body.storeId && serviceKey) {
    try {
      const service = createClient(supabaseUrl, serviceKey);
      const { data: order } = await service
        .from("orders")
        .select("id")
        .eq("id", staffOrderCancelledId)
        .eq("store_id", body.storeId)
        .maybeSingle();
      if (order?.id) return true;
    } catch (e) {
      console.warn("[send-push-notification] staffOrderCancelledId auth check failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!auth.startsWith("Bearer ")) return false;
  if (headerSecret) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (serviceKey) {
      try {
        const service = createClient(supabaseUrl, serviceKey);
        const { data: cfg } = await service
          .from("platform_push_config")
          .select("staff_push_secret")
          .eq("id", 1)
          .maybeSingle();
        if (String(cfg?.staff_push_secret ?? "").trim() === headerSecret) return true;
      } catch (e) {
        console.warn("[send-push-notification] DB staff secret check failed", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

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

async function buildHealthPayload() {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const fcm = getFcmServiceAccount();
  const apns = getApnsConfig();
  const staffSecret = (Deno.env.get("STAFF_PUSH_INTERNAL_SECRET") ?? "").trim();
  let staffSecretMatchesDb: boolean | null = null;
  let iosStaffDevices: number | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      const service = createClient(supabaseUrl, serviceKey);
      const { data: cfg } = await service
        .from("platform_push_config")
        .select("staff_push_secret")
        .eq("id", 1)
        .maybeSingle();
      const dbSecret = String(cfg?.staff_push_secret ?? "").trim();
      staffSecretMatchesDb = Boolean(staffSecret) && staffSecret === dbSecret;

      const { count } = await service
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("platform", "ios")
        .or(`staff_alerts.eq.true,customer_phone.eq.${STAFF_PHONE_TAG}`);
      iosStaffDevices = count ?? 0;
    }
  } catch (e) {
    console.warn("[send-push-notification] health db checks skipped", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

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
    apnsPrimaryHost: apns
      ? apns.useSandbox
        ? "api.sandbox.push.apple.com"
        : "api.push.apple.com"
      : null,
    apnsAlternateHost: apns
      ? apns.useSandbox
        ? "api.push.apple.com"
        : "api.sandbox.push.apple.com"
      : null,
    staffSecretConfigured: Boolean(staffSecret),
    staffSecretMatchesDb,
    iosStaffDevices,
  };
}

async function healthProbeResponse() {
  return new Response(JSON.stringify(await buildHealthPayload()), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isStaffAudienceRow(row: PushSubRow): boolean {
  if (row.staff_alerts === true) return true;
  if (row.order_id) return false;
  const tag = row.customer_phone;
  return tag == null || tag === "" || tag === STAFF_PHONE_TAG;
}

function isMarketingAudienceRow(row: PushSubRow): boolean {
  return row.customer_phone === MARKETING_PHONE_TAG;
}

function selectAudienceRows(
  rows: PushSubRow[],
  opts: { orderId?: string; storeId?: string; audience?: string; customerPhone?: string; marketingBroadcast?: boolean },
): PushSubRow[] {
  if (opts.orderId) return rows.filter((r) => r.order_id === opts.orderId);
  if (opts.audience === "marketing") {
    if (opts.marketingBroadcast) {
      return rows.filter(
        (r) =>
          r.customer_phone === MARKETING_PHONE_TAG ||
          (r.customer_phone != null &&
            r.customer_phone !== STAFF_PHONE_TAG &&
            r.customer_phone !== MARKETING_PHONE_TAG &&
            !r.customer_phone.startsWith("__")),
      );
    }
    if (opts.customerPhone) {
      const phone = opts.customerPhone.trim();
      const direct = rows.filter((r) => r.customer_phone === phone);
      if (direct.length) return direct;
      return rows.filter((r) => r.customer_phone === MARKETING_PHONE_TAG);
    }
    return rows.filter(isMarketingAudienceRow);
  }
  if (opts.storeId) return rows.filter(isStaffAudienceRow);
  return [];
}

// =============================================================
// Handler
// =============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return await healthProbeResponse();

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.probe === true || body?.ping === true || body?.health === true) {
      return await healthProbeResponse();
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
      customerPhone,
      marketingBroadcast,
      staffOrderId,
      staffOrderCancelledId,
      customerOrderEvent,
      welcomeCustomerName,
      welcomeStoreName,
      titleI18n,
      bodyI18n,
      imageUrl: rawImageUrl,
    } = body;

    const imageUrl =
      typeof rawImageUrl === "string" && /^https?:\/\//i.test(rawImageUrl.trim())
        ? rawImageUrl.trim()
        : undefined;

    const marketingTitleI18n =
      titleI18n && typeof titleI18n === "object" ? (titleI18n as Record<string, string>) : undefined;
    const marketingBodyI18n =
      bodyI18n && typeof bodyI18n === "object" ? (bodyI18n as Record<string, string>) : undefined;

    const pushTitle = sanitizeNotificationText(String(title ?? ""));
    const pushBody = sanitizeNotificationText(String(msgBody ?? ""));
    const staffOrderAlertId = typeof staffOrderId === "string" ? staffOrderId : undefined;
    const staffOrderCancelledAlertId =
      typeof staffOrderCancelledId === "string" ? staffOrderCancelledId : undefined;
    const customerEvent =
      typeof customerOrderEvent === "string"
        ? (customerOrderEvent as CustomerOrderPushEvent)
        : undefined;

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

    let staffOrderContext: StaffOrderPushContext | null = null;
    if (staffOrderAlertId && storeId) {
      staffOrderContext = await loadStaffOrderPushContext(supabase, staffOrderAlertId);
    }

    let staffOrderCancelledContext: { orderNumber: string; cancelledByName: string | null } | null = null;
    if (staffOrderCancelledAlertId && storeId) {
      const { data: cancelledOrder } = await supabase
        .from("orders")
        .select("order_number, cancelled_by_name")
        .eq("id", staffOrderCancelledAlertId)
        .maybeSingle();
      if (cancelledOrder) {
        staffOrderCancelledContext = {
          orderNumber: String(cancelledOrder.order_number ?? ""),
          cancelledByName: cancelledOrder.cancelled_by_name ?? null,
        };
      }
    }

    let customerOrderContext: CustomerOrderPushContext | null = null;
    if (orderId && customerEvent) {
      customerOrderContext = await loadCustomerOrderPushContext(supabase, orderId);
    }

    // Tap na notificação = abrir o painel do pedido (SEM aceitar automático).
    // Aceitar automático só acontece via botão da Live Activity ou fallback explicito.
    const resolvedUrl =
      staffOrderAlertId != null
        ? `/panel/live?order=${staffOrderAlertId}`
        : staffOrderCancelledAlertId != null
          ? `/panel/live?order=${staffOrderCancelledAlertId}`
          : orderId && customerEvent
            ? customerOrderPushUrl(
                orderId,
                customerEvent,
                customerOrderContext?.whatsappPhone ?? null,
              )
            : typeof url === "string" && url.trim()
              ? url.trim()
              : "/";

    const usesMarketingI18n =
      Boolean(marketingBroadcast) || Boolean(marketingTitleI18n) || Boolean(marketingBodyI18n);
    let marketingStoreName: string | null = null;
    if (usesMarketingI18n && storeId) {
      const { data: marketingStore } = await supabase
        .from("stores")
        .select("name")
        .eq("id", storeId)
        .maybeSingle();
      marketingStoreName = marketingStore?.name?.trim() || "Kebab Turco";
    }

    if (!directOnly && (storeId || orderId)) {
      let query = supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, order_id, customer_phone, platform, fcm_token, device_locale, staff_alerts");
      if (orderId) query = query.eq("order_id", orderId);
      else if (storeId) query = query.eq("store_id", storeId);
      const { data: rows } = await query;
      const matched = selectAudienceRows((rows ?? []) as PushSubRow[], {
        orderId,
        storeId,
        audience,
        customerPhone: customerPhone as string | undefined,
        marketingBroadcast: Boolean(marketingBroadcast),
      });
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
    console.log("[send-push-notification] subsMatched", {
      storeId,
      staffOrderAlertId,
      total: subs.length,
      byPlatform: subs.reduce((acc: Record<string, number>, s) => {
        const p = (s.platform ?? "web").toLowerCase();
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      }, {}),
      iosSample: subs
        .filter((s) => (s.platform ?? "").toLowerCase() === "ios")
        .map((s) => ({
          endpointPreview: s.endpoint.slice(0, 40),
          hasFcmToken: Boolean(s.fcm_token),
          tokenLen: (s.fcm_token ?? s.endpoint.replace(/^fcm:\/\//i, "")).length,
          staffAlerts: s.staff_alerts,
          customerPhone: s.customer_phone,
          orderId: s.order_id,
        })),
    });

    let sent = 0;
    let sentWeb = 0;
    let sentFcm = 0;
    let sentApns = 0;
    const errors: { endpoint: string; status?: number; message: string; channel: string }[] = [];

    let apnsDeliveryNote: string | undefined;
    // Sempre tentar sandbox + produção no iOS, corrige APNS_USE_SANDBOX errado e tokens de teste/loja.
    const apnsTryBothHosts = true;

    let laSettings: Awaited<ReturnType<typeof loadLiveActivitySettings>> | null = null;
    if ((staffOrderAlertId || customerEvent) && storeId) {
      try {
        laSettings = await loadLiveActivitySettings(supabase, storeId);
      } catch {
        laSettings = null;
      }
    }

    for (const sub of subs) {
      const platform = (sub.platform ?? "web").toLowerCase();
      const localized = staffOrderContext
        ? resolveStaffOrderPushText(staffOrderContext, sub.device_locale, pushTitle, pushBody)
        : staffOrderCancelledContext
          ? resolveStaffOrderCancelledPushText(
              staffOrderCancelledContext.orderNumber,
              staffOrderCancelledContext.cancelledByName,
              sub.device_locale,
              pushTitle,
              pushBody,
            )
          : customerOrderContext && customerEvent
            ? resolveCustomerOrderPushText(
                customerOrderContext,
                sub.device_locale,
                customerEvent,
                pushTitle,
                pushBody,
              )
            : usesMarketingI18n && marketingStoreName
              ? resolveMarketingBroadcastPushText(
                  sub.device_locale,
                  marketingTitleI18n,
                  marketingBodyI18n,
                  marketingStoreName,
                  pushTitle,
                  pushBody,
                )
            : audience === "marketing" &&
                (typeof welcomeCustomerName === "string" || typeof welcomeStoreName === "string")
              ? buildCustomerWelcomePush({
                  locale: sub.device_locale,
                  customerName:
                    typeof welcomeCustomerName === "string" ? welcomeCustomerName : null,
                  storeName: typeof welcomeStoreName === "string" ? welcomeStoreName : null,
                })
              : { title: pushTitle, body: pushBody };
      const subTitle = localized.title;
      const subBody = localized.body;
      const payloadJson = JSON.stringify({
        title: subTitle,
        body: subBody,
        tag,
        url: resolvedUrl,
        requireInteraction,
        ...(imageUrl ? { image: imageUrl } : {}),
      });
      try {
        if (platform === "ios") {
          if (!apns) throw new Error("APNs not configured");
          const token = normalizeNativeToken(sub.fcm_token ?? sub.endpoint.replace(/^fcm:\/\//i, ""));
          const apnsResult = await sendApns(
            token,
            {
              title: subTitle,
              body: subBody,
              tag,
              url: resolvedUrl,
              sound: resolveStaffOrderSound(tag),
              imageUrl,
              orderId: staffOrderAlertId ?? staffOrderCancelledAlertId ?? (orderId as string | undefined),
              storeId: (storeId as string | undefined) ?? undefined,
            },
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
          const staffAcceptDeepLink =
            staffOrderAlertId && storeId
              ? `kebabturco://staff/order/${staffOrderAlertId}?action=accept&store_id=${storeId}&eta=15`
              : undefined;
          await sendFcmV1(
            token,
            {
              title: subTitle,
              body: subBody,
              tag,
              url: resolvedUrl,
              imageUrl,
              requireInteraction,
              acceptAction: staffAcceptDeepLink,
              ongoing: Boolean(staffOrderAlertId || (orderId && customerEvent)),
              accentColor: laSettings?.la_color_normal ?? "#3A0205",
              openLabel: staffOrderAlertId ? "Abrir pedido" : "Acompanhar pedido",
              trackLabel: staffOrderAlertId ? "Aceitar pedido" : undefined,
            },
            fcm,
          );
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

    let liveActivitySent = 0;
    const liveActivityErrors: string[] = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (staffOrderAlertId && storeId) {
      try {
        const laSettingsResolved = laSettings ?? (await loadLiveActivitySettings(supabase, storeId));
        const { data: tokenRows } = await supabase
          .from("staff_live_activity_tokens")
          .select("user_id, token_value")
          .eq("store_id", storeId)
          .eq("token_kind", "push_to_start");
        const liveActivityTokensFound = tokenRows?.length ?? 0;
        console.log("[send-push-notification] liveActivityTokensFound", {
          storeId, staffOrderAlertId, liveActivityTokensFound,
          tokenLens: (tokenRows ?? []).map((r: any) => (r.token_value ?? "").length),
        });
        const userId = tokenRows?.[0]?.user_id ?? "system";
        const la = await dispatchStaffLiveActivityPushToStart({
          admin: supabase,
          storeId,
          orderId: staffOrderAlertId,
          orderNumber: String(staffOrderContext?.orderNumber ?? ""),
          userId,
          userName: "Operador",
          settings: laSettingsResolved,
          supabaseUrl,
          anonKey,
          total: staffOrderContext?.total,
          orderType: staffOrderContext?.orderType,
          tableNumber: staffOrderContext?.tableNumber,
          createdAt: staffOrderContext?.createdAt,
        });
        console.log("[send-push-notification] liveActivityResult", {
          liveActivitySent: la.sent,
          liveActivitySuccess: la.sent > 0,
          liveActivityError: la.errors,
        });
        liveActivitySent += la.sent;
        liveActivityErrors.push(...la.errors);
      } catch (e) {
        console.error("[send-push-notification] liveActivityException", String(e));
        liveActivityErrors.push(String(e));
      }
    }

    if (orderId && customerEvent && storeId) {
      try {
        const laSettings = await loadLiveActivitySettings(supabase, storeId);
        const statusMap: Record<string, string> = {
          pending: "pending",
          payment_paid: "pending",
          preparing: "preparing",
          ready: "ready",
          out_for_delivery: "out_for_delivery",
          delivered: "delivered",
          collected: "delivered",
          served: "delivered",
          cancelled: "cancelled",
        };
        const mappedStatus = statusMap[customerEvent] ?? "pending";
        const terminal = new Set(["delivered", "cancelled"]);
        const la = await dispatchCustomerLiveActivityPush({
          admin: supabase,
          storeId,
          orderId,
          orderNumber: String(customerOrderContext?.orderNumber ?? ""),
          status: mappedStatus,
          settings: laSettings,
          event: terminal.has(mappedStatus) ? "end" : customerEvent === "pending" ? "start" : "update",
        });
        liveActivitySent += la.sent;
        liveActivityErrors.push(...la.errors);
      } catch (e) {
        liveActivityErrors.push(String(e));
      }
    }

    if (staffOrderCancelledAlertId && storeId) {
      try {
        await dispatchStaffLiveActivityEnd({
          admin: supabase,
          storeId,
          orderId: staffOrderCancelledAlertId,
        });
      } catch {
        /* ignore */
      }
    }

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
        liveActivitySent,
        liveActivityErrors: liveActivityErrors.length ? liveActivityErrors : undefined,
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
