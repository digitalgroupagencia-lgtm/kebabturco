import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { issueLiveActivityAcceptToken } from "../_shared/liveActivityAcceptToken.ts";
import {
  formatStaffOrderPrice,
  staffOrderModalityLabel,
} from "../_shared/staffOrderPushMessages.ts";

export type LiveActivityStoreSettings = {
  la_staff_card_title: string;
  la_customer_card_title: string;
  la_staff_new_message: string;
  la_staff_urgent_message: string;
  la_customer_ready_message: string;
  la_color_normal: string;
  la_color_urgent: string;
  la_urgent_after_minutes: number;
};

export const DEFAULT_LA_SETTINGS: LiveActivityStoreSettings = {
  la_staff_card_title: "Novo pedido",
  la_customer_card_title: "O seu pedido",
  la_staff_new_message: "Aguarda aceitação da equipa",
  la_staff_urgent_message: "Urgente — aceite já",
  la_customer_ready_message: "Pode levantar no balcão",
  la_color_normal: "#3A0205",
  la_color_urgent: "#5A080C",
  la_urgent_after_minutes: 5,
};

type AdminClient = ReturnType<typeof createClient>;

type ActivityTokenRow = {
  token_value: string;
  activity_id?: string | null;
  updated_at?: string | null;
};

function tokenDedupeKey(token: string): string {
  return token.replace(/[<>\s]/g, "").toLowerCase().slice(0, 32);
}

function isCustomerActivityId(activityId: string | null | undefined): boolean {
  return String(activityId ?? "").startsWith("customer-");
}

function isStaffActivityForOrder(row: ActivityTokenRow, orderId: string): boolean {
  const activityId = String(row.activity_id ?? "");
  return !isCustomerActivityId(activityId) && (!activityId || activityId === orderId);
}

function isCustomerActivityForOrder(row: ActivityTokenRow, orderId: string): boolean {
  const activityId = String(row.activity_id ?? "");
  return activityId === `customer-${orderId}` || activityId.startsWith("customer-");
}

function uniqueActivityRows<T extends ActivityTokenRow>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    const key = tokenDedupeKey(row.token_value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export async function loadLiveActivitySettings(
  admin: AdminClient,
  storeId: string,
): Promise<LiveActivityStoreSettings> {
  const { data } = await admin
    .from("operations_settings")
    .select(
      "la_staff_card_title, la_customer_card_title, la_staff_new_message, la_staff_urgent_message, la_customer_ready_message, la_color_normal, la_color_urgent, la_urgent_after_minutes",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_LA_SETTINGS };
  const row = data as Record<string, unknown>;
  const mins = Number(row.la_urgent_after_minutes);
  return {
    la_staff_card_title: String(row.la_staff_card_title ?? DEFAULT_LA_SETTINGS.la_staff_card_title),
    la_customer_card_title: String(row.la_customer_card_title ?? DEFAULT_LA_SETTINGS.la_customer_card_title),
    la_staff_new_message: String(row.la_staff_new_message ?? DEFAULT_LA_SETTINGS.la_staff_new_message),
    la_staff_urgent_message: String(row.la_staff_urgent_message ?? DEFAULT_LA_SETTINGS.la_staff_urgent_message),
    la_customer_ready_message: String(row.la_customer_ready_message ?? DEFAULT_LA_SETTINGS.la_customer_ready_message),
    la_color_normal: String(row.la_color_normal ?? DEFAULT_LA_SETTINGS.la_color_normal),
    la_color_urgent: String(row.la_color_urgent ?? DEFAULT_LA_SETTINGS.la_color_urgent),
    la_urgent_after_minutes: Number.isFinite(mins) ? Math.min(120, Math.max(1, Math.round(mins))) : 5,
  };
}

type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  topic: string;
  useSandbox: boolean;
};

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

export function getApnsConfigFromEnv(): ApnsConfig | null {
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
  if (cachedApnsJwt && cachedApnsJwt.expiresAt - 120 > now) return cachedApnsJwt.token;
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

function formatOrderNumber(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, "0");
  return trimmed;
}

function formatElapsedSince(iso: string | null | undefined): string {
  const start = iso ? Date.parse(iso) : Date.now();
  const ms = Math.max(0, Date.now() - (Number.isFinite(start) ? start : Date.now()));
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function customerStepIndex(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "preparing":
      return 1;
    case "ready":
      return 2;
    case "out_for_delivery":
      return 3;
    case "delivered":
    case "completed":
      return 4;
    default:
      return 0;
  }
}

function customerStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pedido recebido";
    case "preparing":
      return "Em preparação";
    case "ready":
      return "Pronto";
    case "out_for_delivery":
      return "Saiu para entrega";
    case "delivered":
    case "completed":
      return "Entregue";
    default:
      return "A acompanhar";
  }
}

async function sendLiveActivityApns(
  deviceToken: string,
  payload: Record<string, unknown>,
  config: ApnsConfig,
  event: "start" | "update" | "end",
  logContext?: { orderId?: string; storeId?: string },
): Promise<{ ok: boolean; error?: string; host?: string; status?: number }> {
  const token = deviceToken.replace(/[<>\s]/g, "").toLowerCase();
  // Live Activity push-to-start tokens são hex de comprimento variável (tipicamente 160+ chars),
  // ao contrário dos device tokens normais (64). Aceitar qualquer hex >= 64.
  if (!/^[0-9a-f]+$/i.test(token) || token.length < 64) {
    console.warn("[liveActivityApns] token inválido", { len: token.length, event });
    return { ok: false, error: `token inválido (len=${token.length})` };
  }

  const jwt = await getApnsJwt(config);
  const topic = `${config.topic}.push-type.liveactivity`;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ aps: { timestamp, event, ...payload } });
  const payloadKeys = Object.keys(payload);

  const hosts = config.useSandbox
    ? ["api.sandbox.push.apple.com", "api.push.apple.com"]
    : ["api.push.apple.com", "api.sandbox.push.apple.com"];

  // Collapse-id só para update/end. Em "start" o iOS ignora silenciosamente o push
  // colapsado (APNs devolve 200 mas nenhuma Live Activity é criada) — regressão observada.
  const orderId = logContext?.orderId;
  const collapseId =
    event !== "start" && orderId ? `la-staff-${orderId}`.slice(0, 64) : undefined;


  const attempts: Array<{ host: string; status: number; text: string }> = [];
  for (const host of hosts) {
    const res = await fetch(`https://${host}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": topic,
        "apns-push-type": "liveactivity",
        "apns-priority": "10",
        ...(collapseId ? { "apns-collapse-id": collapseId } : {}),
        "content-type": "application/json",
      },
      body,
    });
    const text = res.ok ? "" : await res.text();
    attempts.push({ host, status: res.status, text });
    if (res.ok) {
      console.log("[liveActivityApns] sent", {
        host,
        topic,
        event,
        tokenLen: token.length,
        tokenPreview: token.slice(0, 12),
        orderId: logContext?.orderId,
        storeId: logContext?.storeId,
        collapseId,
        payloadKeys,
        hasInputPushToken: payload["input-push-token"] === 1,
        payloadBytes: body.length,
      });
      return { ok: true, host, status: res.status };
    }
    if (res.status === 410) {
      console.warn("[liveActivityApns] 410 gone", { host, event, orderId: logContext?.orderId });
      return { ok: false, error: text, host, status: 410 };
    }
  }
  const last = attempts[attempts.length - 1];
  console.error("[liveActivityApns] falhou", {
    event,
    topic,
    tokenLen: token.length,
    tokenPreview: token.slice(0, 12),
    orderId: logContext?.orderId,
    storeId: logContext?.storeId,
    attempts,
  });
  return {
    ok: false,
    error: attempts.map((a) => `${a.host}:${a.status} ${a.text}`).join(" | ") || "APNs live activity falhou",
    host: last?.host,
    status: last?.status,
  };
}

function buildAttributes(
  orderId: string,
  orderNumber: string,
  storeId: string,
  role: "staff" | "customer",
  acceptToken: string,
  acceptUrl: string,
  apiKey: string,
) {
  return {
    id: role === "customer" ? `customer-${orderId}` : orderId,
    staticValues: {
      orderId,
      orderNumber,
      storeId,
      role,
      acceptToken,
      acceptUrl,
      apiKey,
    },
  };
}

export async function dispatchStaffLiveActivityPushToStart(opts: {
  admin: AdminClient;
  storeId: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  userName: string;
  settings: LiveActivityStoreSettings;
  supabaseUrl: string;
  anonKey: string;
  total?: number;
  orderType?: string | null;
  tableNumber?: string | null;
  createdAt?: string | null;
}): Promise<{ sent: number; errors: string[] }> {
  const config = getApnsConfigFromEnv();
  if (!config) return { sent: 0, errors: ["APNs não configurado"] };

  // Dedup: se já existe uma Live Activity ATIVA para este pedido (temos activity_update tokens),
  // enviamos apenas UPDATE em vez de criar outra Live Activity via push_to_start.
  const { data: existingUpdateTokens } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("token_value, activity_id, updated_at")
    .eq("store_id", opts.storeId)
    .eq("order_id", opts.orderId)
    .eq("token_kind", "activity_update")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const updateRows = uniqueActivityRows(
    ((existingUpdateTokens ?? []) as ActivityTokenRow[]).filter((row) =>
      isStaffActivityForOrder(row, opts.orderId),
    ),
  );
  const formattedNumber = formatOrderNumber(opts.orderNumber);
  const totalLabel = formatStaffOrderPrice(Number(opts.total) || 0, "pt");
  const orderTypeLabel = staffOrderModalityLabel(opts.orderType, opts.tableNumber, "pt");
  const timer = formatElapsedSince(opts.createdAt);
  const cardTitle = `${opts.settings.la_staff_card_title} #${formattedNumber}`;

  if (updateRows.length > 0) {
    const startedAtEpoch = String(
      Math.floor((opts.createdAt ? Date.parse(opts.createdAt) : Date.now()) / 1000),
    );
    const contentState = {
      values: {
        title: opts.settings.la_staff_card_title,
        orderNumber: formattedNumber,
        total: totalLabel,
        orderType: orderTypeLabel,
        message: opts.settings.la_staff_urgent_message,
        timer,
        startedAt: startedAtEpoch,
        urgentAfterMinutes: String(opts.settings.la_urgent_after_minutes ?? 5),
        status: "PENDENTE",
        urgent: "1",
        colorNormal: opts.settings.la_color_normal,
        colorUrgent: opts.settings.la_color_urgent,
        role: "staff",
      },
    };
    let sent = 0;
    const errors: string[] = [];
    console.log("[liveActivity] update existing staff activity", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      updateTokens: updateRows.length,
    });
    // IMPORTANTE: não incluir `alert` no update — cada alert com liveactivity
    // cria um novo card na lock screen, o que duplica visualmente a mesma LA.
    // O som/alerta do pedido é entregue pelo push normal separado.
    for (const row of updateRows) {
      const result = await sendLiveActivityApns(
        row.token_value,
        { "content-state": contentState },
        config,
        "update",
        { orderId: opts.orderId, storeId: opts.storeId },
      );
      if (result.ok) sent++;
      else if (result.error) errors.push(`update: ${result.error}`);
    }
    console.log("[liveActivity] dedup update (LA já existente)", { orderId: opts.orderId, sent });
    return { sent, errors };
  }

  const { data: startMarkers } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("id, updated_at")
    .eq("store_id", opts.storeId)
    .eq("order_id", opts.orderId)
    .eq("token_kind", "staff_start_sent")
    .eq("is_active", true)
    .limit(1);

  if ((startMarkers ?? []).length > 0) {
    console.log("[liveActivity] start já enviado; aguarda activity_update token", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      markerUpdatedAt: startMarkers?.[0]?.updated_at,
    });
    return { sent: 0, errors: [] };
  }

  const { data: tokens } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("token_value, user_id")
    .eq("store_id", opts.storeId)
    .eq("token_kind", "push_to_start");

  const rows = uniqueActivityRows((tokens ?? []) as Array<{ token_value: string; user_id: string | null }>);
  if (!rows.length) {
    return {
      sent: 0,
      errors: [
        "Nenhum iPhone registado para cartão grande (push_to_start). Abra a app da equipa, ligue alertas e iOS 17.2+.",
      ],
    };
  }

  const acceptUrl = `${opts.supabaseUrl}/functions/v1/accept-order-from-live-activity`;

  let sent = 0;
  const errors: string[] = [];

  // Reserva atómica antes do envio. Se duas invocações chegarem juntas, só a
  // primeira pode enviar START; as seguintes ficam como push normal apenas.
  const { error: markerError } = await opts.admin.from("staff_live_activity_tokens").insert({
    store_id: opts.storeId,
    order_id: opts.orderId,
    token_kind: "staff_start_sent",
    token_value: rows[0].token_value.slice(0, 64),
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (markerError) {
    console.log("[liveActivity] start bloqueado por marker existente", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      code: markerError.code,
      message: markerError.message,
    });
    return { sent: 0, errors: [] };
  }

  for (const row of rows) {
    const uid = row.user_id ?? opts.userId;
    let userName = opts.userName;
    if (row.user_id) {
      const { data: prof } = await opts.admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (prof?.full_name) userName = String(prof.full_name);
    }

    const acceptToken = await issueLiveActivityAcceptToken({
      order_id: opts.orderId,
      store_id: opts.storeId,
      user_id: uid,
      user_name: userName,
    });

    const startedAtEpoch = String(
      Math.floor((opts.createdAt ? Date.parse(opts.createdAt) : Date.now()) / 1000),
    );
    const contentState = {
      values: {
        title: opts.settings.la_staff_card_title,
        orderNumber: formattedNumber,
        total: totalLabel,
        orderType: orderTypeLabel,
        message: opts.settings.la_staff_new_message,
        timer,
        startedAt: startedAtEpoch,
        urgentAfterMinutes: String(opts.settings.la_urgent_after_minutes ?? 5),
        status: "PENDENTE",
        urgent: "0",
        colorNormal: opts.settings.la_color_normal,
        colorUrgent: opts.settings.la_color_urgent,
        role: "staff",
      },
    };

    const attributes = buildAttributes(
      opts.orderId,
      formattedNumber,
      opts.storeId,
      "staff",
      acceptToken,
      acceptUrl,
      opts.anonKey,
    );

    // (cardTitle já calculado acima para dedup)
    console.log("[liveActivity] start staff activity", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      tokenLen: row.token_value.length,
      attributesType: "GenericAttributes",
      inputPushToken: 1,
    });
    const result = await sendLiveActivityApns(
      row.token_value,
      {
        "content-state": contentState,
        "attributes-type": "GenericAttributes",
        "input-push-token": 1,
        attributes,
        alert: {
          title: cardTitle,
          body: `${totalLabel} · ${orderTypeLabel}`,
          sound: "staff_order_alert.caf",
        },
      },
      config,
      "start",
      { orderId: opts.orderId, storeId: opts.storeId },
    );
    if (result.ok) {
      sent++;
    } else if (result.error) errors.push(result.error);
  }

  return { sent, errors };
}

export async function dispatchCustomerLiveActivityPush(opts: {
  admin: AdminClient;
  storeId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  settings: LiveActivityStoreSettings;
  event?: "start" | "update" | "end";
}): Promise<{ sent: number; errors: string[] }> {
  const config = getApnsConfigFromEnv();
  if (!config) return { sent: 0, errors: ["APNs não configurado"] };

  const terminal = new Set(["delivered", "completed", "cancelled"]);
  const isTerminal = terminal.has(opts.status);

  const { data: startTokens } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("token_value")
    .eq("order_id", opts.orderId)
    .eq("token_kind", "customer_push_to_start")
    .eq("is_active", true);

  const { data: updateTokens } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("token_value, activity_id, token_kind, updated_at")
    .eq("order_id", opts.orderId)
    .in("token_kind", ["customer_activity_update", "activity_update"])
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const startRows = uniqueActivityRows((startTokens ?? []) as Array<{ token_value: string }>);
  const updateRows = uniqueActivityRows(
    ((updateTokens ?? []) as Array<ActivityTokenRow & { token_kind?: string }>).filter((row) =>
      row.token_kind === "customer_activity_update" || isCustomerActivityForOrder(row, opts.orderId),
    ),
  );

  console.log("[liveActivity] customer tokens", {
    orderId: opts.orderId,
    storeId: opts.storeId,
    startTokensFound: startRows.length,
    updateTokensFound: updateRows.length,
    status: opts.status,
    event: opts.event,
  });

  const statusLabel = customerStatusLabel(opts.status);
  const title = `${opts.settings.la_customer_card_title} #${opts.orderNumber}`;
  const message = opts.status === "ready" ? opts.settings.la_customer_ready_message : statusLabel;

  const contentState = {
    values: {
      title: opts.settings.la_customer_card_title,
      orderNumber: formatOrderNumber(opts.orderNumber),
      message,
      timer: "",
      status: statusLabel,
      step: String(customerStepIndex(opts.status)),
      urgent: "0",
      colorNormal: opts.settings.la_color_normal,
      colorUrgent: opts.settings.la_color_urgent,
      role: "customer",
    },
  };

  const attributes = buildAttributes(opts.orderId, opts.orderNumber, opts.storeId, "customer", "", "", "");

  let sent = 0;
  const errors: string[] = [];

  // Terminal: dismiss existing activities apenas.
  if (isTerminal) {
    for (const row of updateRows) {
      const result = await sendLiveActivityApns(
        row.token_value,
        { "content-state": contentState, "dismissal-date": Math.floor(Date.now() / 1000) },
        config,
        "end",
        { orderId: opts.orderId, storeId: opts.storeId },
      );
      if (result.ok) sent++;
      else if (result.error) errors.push(result.error);
    }
    return { sent, errors };
  }

  // Se já existe activity ativa (temos update tokens), enviar apenas UPDATE.
  // Nunca reenviar START — isso duplica a Live Activity do cliente.
  if (updateRows.length > 0) {
    for (const row of updateRows) {
      const result = await sendLiveActivityApns(
        row.token_value,
        { "content-state": contentState },
        config,
        "update",
        { orderId: opts.orderId, storeId: opts.storeId },
      );
      if (result.ok) sent++;
      else if (result.error) errors.push(result.error);
    }
    return { sent, errors };
  }

  // Sem update tokens: iniciar via push-to-start (uma vez).
  if (startRows.length === 0) {
    console.log("[liveActivity] customer token not found", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      status: opts.status,
    });
    return { sent: 0, errors: ["customer token not found"] };
  }

  const { error: markerError } = await opts.admin.from("staff_live_activity_tokens").insert({
    store_id: opts.storeId,
    order_id: opts.orderId,
    token_kind: "customer_start_sent",
    token_value: startRows[0]?.token_value?.slice(0, 64) ?? "customer_start",
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (markerError) {
    console.log("[liveActivity] customer start bloqueado por marker existente", {
      orderId: opts.orderId,
      storeId: opts.storeId,
      code: markerError.code,
      message: markerError.message,
    });
    return { sent: 0, errors: [] };
  }

  for (const row of startRows) {
    const result = await sendLiveActivityApns(
      row.token_value,
      {
        "content-state": contentState,
        "attributes-type": "GenericAttributes",
        "input-push-token": 1,
        attributes,
        alert: { title, body: message, sound: "default" },
      },
      config,
      "start",
      { orderId: opts.orderId, storeId: opts.storeId },
    );
    if (result.ok) sent++;
    else if (result.error) errors.push(result.error);
  }
  return { sent, errors };
}

export async function dispatchStaffLiveActivityEnd(opts: {
  admin: AdminClient;
  storeId: string;
  orderId: string;
}): Promise<{ sent: number }> {
  const config = getApnsConfigFromEnv();
  if (!config) return { sent: 0 };

  const { data: updateTokens } = await opts.admin
    .from("staff_live_activity_tokens")
    .select("token_value, activity_id, updated_at")
    .eq("store_id", opts.storeId)
    .eq("order_id", opts.orderId)
    .eq("token_kind", "activity_update")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const rows = uniqueActivityRows(
    ((updateTokens ?? []) as ActivityTokenRow[]).filter((row) =>
      isStaffActivityForOrder(row, opts.orderId),
    ),
  );

  let sent = 0;
  console.log("[liveActivity] end staff activity", {
    orderId: opts.orderId,
    storeId: opts.storeId,
    updateTokens: rows.length,
  });
  for (const row of rows) {
    const result = await sendLiveActivityApns(
      row.token_value,
      {
        "content-state": {
          values: {
            title: "Pedido tratado",
            message: "Pedido já não está pendente",
            timer: "",
            status: "ENCERRADO",
            urgent: "0",
            role: "staff",
          },
        },
        "dismissal-date": Math.floor(Date.now() / 1000),
      },
      config,
      "end",
      { orderId: opts.orderId, storeId: opts.storeId },
    );
    if (result.ok) sent++;
  }
  await opts.admin
    .from("staff_live_activity_tokens")
    .update({ is_active: false, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("store_id", opts.storeId)
    .eq("order_id", opts.orderId)
    .in("token_kind", ["activity_update", "staff_start_sent"]);
  return { sent };
}
