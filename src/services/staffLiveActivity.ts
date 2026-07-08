import { registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOSAppSync, isNativeAndroidAppSync } from "@/lib/nativeAppPlatform";
import { mergeLiveActivitySettings, type LiveActivitySettings } from "@/lib/liveActivitySettings";
import {
  formatLiveActivityOrderNumber,
  formatLiveActivityPrice,
  staffLiveActivityModalityLabel,
} from "@/lib/liveActivityOrderLabels";
import { showAndroidOrderCard, endAndroidOrderCard } from "@/services/androidOrderCard";

export type StaffLiveActivityOrderMeta = {
  total?: number;
  orderType?: string | null;
  tableNumber?: string | null;
  createdAt?: string | null;
};

export type StaffLiveActivityState = {
  title: string;
  message: string;
  timer: string;
  status: string;
  urgent: "0" | "1";
  colorNormal: string;
  colorUrgent: string;
  role: "staff";
  orderNumber: string;
  total: string;
  orderType: string;
};

type LiveActivityPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  startActivity(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<{ activityId: string }>;
  startActivityWithPush?(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<{ activityId: string }>;
  updateActivity(options: {
    id: string;
    contentState: Record<string, string>;
    alert?: { title: string; body: string; sound?: string };
  }): Promise<void>;
  endActivity(options: { id: string; dismissalPolicy?: "immediate" | "default" }): Promise<void>;
  observePushToStartToken?(): Promise<void>;
  setUpdateTokenEndpoint?(options: { url: string; headers?: Record<string, string> }): Promise<void>;
  addListener?(
    eventName: string,
    listenerFunc: (data: { token?: string; id?: string }) => void,
  ): Promise<{ remove: () => void }>;
};

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

const activeOrderActivities = new Map<string, number>();
const orderStartedAt = new Map<string, number>();
const settingsCache = new Map<string, LiveActivitySettings>();
let pushToStartObserverStarted = false;
let pushToStartListenerReady = false;
let pushToStartStoreId: string | null = null;
const PUSH_TO_START_CACHE_KEY = "la-staff-push-to-start-token";
let updateEndpointConfigured = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function loadSettings(storeId: string): Promise<LiveActivitySettings> {
  const cached = settingsCache.get(storeId);
  if (cached) return cached;
  const { data } = await supabase
    .from("operations_settings")
    .select(
      "la_staff_card_title, la_customer_card_title, la_staff_new_message, la_staff_urgent_message, la_customer_ready_message, la_color_normal, la_color_urgent, la_urgent_after_minutes",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  const merged = mergeLiveActivitySettings(data as Partial<LiveActivitySettings> | null);
  settingsCache.set(storeId, merged);
  return merged;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function resolveStartedAt(orderId: string, meta?: StaffLiveActivityOrderMeta): number {
  const existing = orderStartedAt.get(orderId);
  if (existing) return existing;
  const fromCreated = meta?.createdAt ? Date.parse(meta.createdAt) : NaN;
  const startedAt = Number.isFinite(fromCreated) ? fromCreated : Date.now();
  orderStartedAt.set(orderId, startedAt);
  return startedAt;
}

function buildState(
  orderNumber: string,
  startedAt: number,
  urgent: boolean,
  settings: LiveActivitySettings,
  meta?: StaffLiveActivityOrderMeta,
): StaffLiveActivityState {
  const formattedNumber = formatLiveActivityOrderNumber(orderNumber);
  return {
    title: settings.la_staff_card_title,
    message: urgent ? settings.la_staff_urgent_message : settings.la_staff_new_message,
    timer: formatElapsed(Date.now() - startedAt),
    status: urgent ? "URGENTE" : "PENDENTE",
    urgent: urgent ? "1" : "0",
    colorNormal: settings.la_color_normal,
    colorUrgent: settings.la_color_urgent,
    role: "staff",
    orderNumber: formattedNumber,
    total: formatLiveActivityPrice(meta?.total ?? 0),
    orderType: staffLiveActivityModalityLabel(meta?.orderType, meta?.tableNumber),
  };
}

async function issueAcceptToken(orderId: string, storeId: string): Promise<{ token: string; acceptUrl: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("issue-live-activity-accept-token", {
      body: { order_id: orderId, store_id: storeId },
    });
    if (error || !data?.token) return null;
    return {
      token: String(data.token),
      acceptUrl: String(data.accept_url ?? `${SUPABASE_URL}/functions/v1/accept-order-from-live-activity`),
    };
  } catch {
    return null;
  }
}

async function ensureUpdateTokenEndpoint(): Promise<void> {
  if (!isNativeIOSAppSync() || updateEndpointConfigured) return;
  updateEndpointConfigured = true;
  try {
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;
    await LiveActivity.setUpdateTokenEndpoint?.({
      url: `${SUPABASE_URL}/functions/v1/register-live-activity-update-token`,
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    });
    LiveActivity.addListener?.("liveActivityPushToken", async (event) => {
      const token = event?.token?.trim();
      const id = event?.id?.trim();
      if (!token || !id) return;
      await supabase.functions.invoke("register-live-activity-update-token", {
        body: { activity_id: id, order_id: id, token },
      });
    });
  } catch {
    /* ignore */
  }
}

async function persistPushToStartToken(storeId: string, token: string): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return false;
    }

    const { error } = await supabase.functions.invoke("register-staff-live-activity-token", {
      body: { store_id: storeId, push_to_start_token: token, token_kind: "push_to_start" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) return false;

    try {
      localStorage.setItem(PUSH_TO_START_CACHE_KEY, token);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

async function retryCachedPushToStartToken(storeId: string): Promise<void> {
  try {
    const cached = localStorage.getItem(PUSH_TO_START_CACHE_KEY)?.trim();
    if (!cached) return;
    await persistPushToStartToken(storeId, cached);
  } catch {
    /* ignore */
  }
}

async function ensurePushToStartListener(): Promise<void> {
  if (pushToStartListenerReady || !LiveActivity.addListener) return;
  pushToStartListenerReady = true;

  await LiveActivity.addListener("liveActivityPushToStartToken", async (event) => {
    const token = event?.token?.trim();
    const storeId = pushToStartStoreId;
    if (!token || !storeId) return;
    await persistPushToStartToken(storeId, token);
  });
}

export type StaffLiveActivityPushToStartResult = {
  ok: boolean;
  reason?: "not-ios" | "disabled" | "ios-too-old" | "no-session" | "observer-failed" | "db-not-ready" | "timeout" | "probe-failed";
  registeredInDb?: boolean;
  progress?: string;
};

function readLiveActivityAvailability(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const row = result as { value?: boolean; available?: boolean };
  return Boolean(row.value ?? row.available);
}

async function configureNativeStaffLiveActivity(storeId: string): Promise<void> {
  try {
    const { ApnsTokenBridge } = await import("@/lib/apnsTokenBridge");
    if (!ApnsTokenBridge.configureStaffLiveActivity) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) return;
    const appVersion =
      (import.meta.env.VITE_APP_VERSION as string | undefined) ??
      (typeof window !== "undefined"
        ? (window as unknown as { __APP_VERSION__?: string }).__APP_VERSION__
        : undefined) ??
      "";
    await ApnsTokenBridge.configureStaffLiveActivity({
      supabaseUrl: SUPABASE_URL,
      anonKey: SUPABASE_ANON,
      jwt,
      storeId,
      userId: session?.user?.id ?? "",
      deviceId: "",
      appVersion,
    });
    console.info("[StaffLA] observador nativo push-to-start configurado");
  } catch (e) {
    console.warn("[StaffLA] falha a configurar observador nativo", e);
  }
}

export async function ensureStaffLiveActivityPushToStart(
  storeId: string,
  opts?: { force?: boolean },
): Promise<StaffLiveActivityPushToStartResult> {
  if (!isNativeIOSAppSync()) return { ok: false, reason: "not-ios" };

  pushToStartStoreId = storeId;
  await retryCachedPushToStartToken(storeId);
  void configureNativeStaffLiveActivity(storeId);

  try {
    const result = await LiveActivity.isAvailable();
    const enabled = readLiveActivityAvailability(result);
    if (!enabled) return { ok: false, reason: "disabled" };
  } catch {
    return { ok: false, reason: "disabled" };
  }

  await ensurePushToStartListener();

  if (pushToStartObserverStarted && !opts?.force) {
    return { ok: true };
  }

  if (!LiveActivity.observePushToStartToken) {
    return { ok: false, reason: "ios-too-old" };
  }

  try {
    await LiveActivity.observePushToStartToken();
    pushToStartObserverStarted = true;
    return { ok: true };
  } catch {
    pushToStartObserverStarted = false;
    return { ok: false, reason: "observer-failed" };
  }
}

export async function checkStaffLockScreenCardCount(storeId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("count_staff_la_push_to_start_tokens", {
      _store_id: storeId,
    });
    if (error) {
      if (/function|does not exist|schema cache/i.test(error.message)) return -1;
      return -1;
    }
    return typeof data === "number" ? data : Number(data) || 0;
  } catch {
    return -1;
  }
}

export function describeLockScreenCardStatus(opts: {
  count: number;
  result?: StaffLiveActivityPushToStartResult & { registeredInDb?: boolean };
}): { tone: "ok" | "warn" | "error"; title: string; detail: string } {
  const { count, result } = opts;

  if (result?.registeredInDb || count > 0) {
    return {
      tone: "ok",
      title: "Cartão no ecrã bloqueado: registado",
      detail:
        "Este iPhone está pronto. Ao chegar um pedido novo, deve aparecer o cartão grande com ACEITAR (com a app fechada ou ecrã bloqueado).",
    };
  }

  if (result?.reason === "ios-too-old") {
    return {
      tone: "error",
      title: "iPhone demasiado antigo para o cartão grande",
      detail: "Precisa de iOS 17.2 ou mais recente. Definições → Geral → Informação → Versão do software.",
    };
  }

  if (result?.reason === "disabled") {
    return {
      tone: "error",
      title: "Atividades em tempo real desligadas",
      detail: "Definições do iPhone → Kebab Turco → ligue Notificações e Atividades em tempo real (se aparecer).",
    };
  }

  if (result?.reason === "not-ios") {
    return {
      tone: "warn",
      title: "Só funciona na app no iPhone",
      detail: "Abra a app Kebab Turco instalada no telemóvel — não use o site no browser do computador ou do telemóvel.",
    };
  }

  if (result?.reason === "no-session") {
    return {
      tone: "warn",
      title: "Tem de estar com sessão iniciada",
      detail: "Saia e entre outra vez no painel na app, depois carregue em «Registar cartão no ecrã».",
    };
  }

  if (count === -1 || result?.reason === "db-not-ready") {
    return {
      tone: "warn",
      title: "Base de dados ainda não preparada",
      detail: "Peça para correr o script LIVE_ACTIVITY_FULL no Supabase (ou no editor SQL da Lovable) e Publish.",
    };
  }

  if (result?.reason === "probe-failed") {
    return {
      tone: "error",
      title: "O cartão grande não consegue arrancar neste iPhone",
      detail:
        "O cartão grande não arrancou neste telemóvel. Confirme que usa a app pelo TestFlight (versão actual) e, se precisar, desinstale e instale outra vez.",
    };
  }

  if (result?.reason === "timeout" || result?.ok) {
    return {
      tone: "warn",
      title: "Aviso pequeno OK — cartão grande ainda não registado",
      detail:
        "Mantenha a app aberta 20 segundos e carregue outra vez em «Registar cartão no ecrã». Confirme iOS 17.2+ e Atividades em tempo real ligadas.",
    };
  }

  return {
    tone: "warn",
    title: "Cartão no ecrã bloqueado: ainda não registado",
    detail: "Carregue no botão abaixo. Não feche a app enquanto espera.",
  };
}

async function probeLocalLiveActivity(storeId: string): Promise<{ ok: boolean }> {
  const probeId = "__kebab_la_probe__";
  try {
    const settings = await loadSettings(storeId);
    const state = {
      title: settings.la_staff_card_title,
      message: "A testar cartão no ecrã…",
      timer: "0:00",
      status: "TESTE",
      urgent: "0",
      colorNormal: settings.la_color_normal,
      colorUrgent: settings.la_color_urgent,
      role: "staff",
      orderNumber: "0000",
      total: "€0,00",
      orderType: "Teste",
    };
    const starter = LiveActivity.startActivityWithPush ?? LiveActivity.startActivity;
    await starter.call(LiveActivity, {
      id: probeId,
      attributes: { orderId: probeId, orderNumber: "0000", storeId, role: "staff" },
      contentState: { ...state },
    });
    await new Promise((r) => setTimeout(r, 2500));
    await LiveActivity.endActivity({
      id: probeId,
      contentState: { ...state },
      dismissalPolicy: "immediate",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function registerStaffLockScreenCard(
  storeId: string,
  opts?: { onProgress?: (message: string) => void },
): Promise<StaffLiveActivityPushToStartResult> {
  const progress = (message: string) => opts?.onProgress?.(message);

  if (!isNativeIOSAppSync()) {
    return { ok: false, reason: "not-ios" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, reason: "no-session" };
  }

  progress("A verificar a base de dados…");
  const initialCount = await checkStaffLockScreenCardCount(storeId);
  if (initialCount === -1) {
    return { ok: false, reason: "db-not-ready" };
  }
  if (initialCount > 0) {
    return { ok: true, registeredInDb: true };
  }

  progress("A preparar o cartão no iPhone…");
  const probeOk = (await probeLocalLiveActivity(storeId)).ok;

  await retryCachedPushToStartToken(storeId);
  progress("A pedir o código ao iPhone…");
  const result = await ensureStaffLiveActivityPushToStart(storeId, { force: true });
  if (!result.ok) return result;

  for (let i = 0; i < 12; i++) {
    const seconds = (i + 1) * 2;
    progress(`A aguardar o iPhone (${seconds}s)… não feche a app`);
    await new Promise((r) => setTimeout(r, 2000));
    await retryCachedPushToStartToken(storeId);
    const count = await checkStaffLockScreenCardCount(storeId);
    if (count === -1) return { ok: false, reason: "db-not-ready" };
    if (count > 0) return { ok: true, registeredInDb: true };
  }

  if (!probeOk) {
    return { ok: false, reason: "probe-failed", registeredInDb: false };
  }

  return { ok: true, registeredInDb: false, reason: "timeout" };
}

export async function isStaffLiveActivitySupported(): Promise<boolean> {
  if (isNativeAndroidAppSync()) return true;
  if (!isNativeIOSAppSync()) return false;
  try {
    const result = await LiveActivity.isAvailable();
    return readLiveActivityAvailability(result);
  } catch {
    return false;
  }
}

export async function startStaffOrderLiveActivity(
  orderId: string,
  orderNumber: string,
  storeId: string,
  meta?: StaffLiveActivityOrderMeta,
): Promise<void> {
  const settings = await loadSettings(storeId);
  const tokenBundle = await issueAcceptToken(orderId, storeId);
  const startedAt = resolveStartedAt(orderId, meta);
  const state = buildState(orderNumber, startedAt, false, settings, meta);
  const acceptDeepLink = `kebabturco://staff/order/${orderId}?action=accept&store_id=${storeId}&eta=15`;
  const cardTitle = `${state.title} #${state.orderNumber}`;

  if (isNativeAndroidAppSync()) {
    await showAndroidOrderCard({
      id: orderId,
      title: cardTitle,
      body: `${state.total} · ${state.orderType} · Aguardando ${state.timer}`,
      status: state.orderType,
      url: `/panel/live?order=${orderId}&action=accept&store_id=${storeId}&eta=15`,
      acceptUrl: acceptDeepLink,
      accentColor: settings.la_color_normal,
      ongoing: true,
    });
  }

  if (!(await isStaffLiveActivitySupported()) || !isNativeIOSAppSync()) {
    scheduleUrgentTick(orderId, orderNumber, storeId, startedAt, settings, meta);
    return;
  }

  void ensureStaffLiveActivityPushToStart(storeId, { force: false });
  void ensureUpdateTokenEndpoint();

  try {
    const starter = LiveActivity.startActivityWithPush ?? LiveActivity.startActivity;
    await starter.call(LiveActivity, {
      id: orderId,
      attributes: {
        orderId,
        orderNumber: state.orderNumber,
        storeId,
        role: "staff",
        acceptToken: tokenBundle?.token ?? "",
        acceptUrl: tokenBundle?.acceptUrl ?? `${SUPABASE_URL}/functions/v1/accept-order-from-live-activity`,
        apiKey: SUPABASE_ANON,
      },
      contentState: { ...state },
    });

    scheduleUrgentTick(orderId, orderNumber, storeId, startedAt, settings, meta);
  } catch {
    /* extensão indisponível */
  }
}

function scheduleUrgentTick(
  orderId: string,
  orderNumber: string,
  storeId: string,
  startedAt: number,
  settings: LiveActivitySettings,
  meta?: StaffLiveActivityOrderMeta,
) {
  if (activeOrderActivities.has(orderId)) {
    window.clearInterval(activeOrderActivities.get(orderId)!);
  }

  const urgentMs = settings.la_urgent_after_minutes * 60 * 1000;
  const tick = window.setInterval(() => {
    void (async () => {
      const urgent = Date.now() - startedAt >= urgentMs;
      const next = buildState(orderNumber, startedAt, urgent, settings, meta);
      const cardTitle = `${next.title} #${next.orderNumber}`;
      if (isNativeAndroidAppSync()) {
        await showAndroidOrderCard({
          id: orderId,
          title: cardTitle,
          body: `${next.total} · ${next.orderType} · Aguardando ${next.timer}`,
          status: next.orderType,
          url: `/panel/live?order=${orderId}`,
          accentColor: urgent ? settings.la_color_urgent : settings.la_color_normal,
          ongoing: true,
        });
        return;
      }
      if (!isNativeIOSAppSync()) return;
      await LiveActivity.updateActivity({
        id: orderId,
        contentState: { ...next },
        alert: urgent ? { title: cardTitle, body: next.message, sound: "default" } : undefined,
      }).catch(() => undefined);
    })();
  }, 15_000);

  activeOrderActivities.set(orderId, tick);
}

export async function endStaffOrderLiveActivity(orderId: string): Promise<void> {
  const tick = activeOrderActivities.get(orderId);
  if (tick) {
    window.clearInterval(tick);
    activeOrderActivities.delete(orderId);
  }
  orderStartedAt.delete(orderId);
  if (isNativeAndroidAppSync()) {
    await endAndroidOrderCard(orderId);
  }
  if (!isNativeIOSAppSync()) return;
  try {
    await LiveActivity.endActivity({ id: orderId, dismissalPolicy: "immediate" });
  } catch {
    /* ignore */
  }
}

export function invalidateLiveActivitySettingsCache(storeId?: string): void {
  if (storeId) settingsCache.delete(storeId);
  else settingsCache.clear();
}
