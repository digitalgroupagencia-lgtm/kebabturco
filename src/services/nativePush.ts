/**
 * Registo de push nativo (FCM Android / APNs iOS) via Capacitor.
 * Só corre dentro do APK/IPA; no browser web usa-se Web Push VAPID.
 */
import { supabase } from "@/integrations/supabase/client";
import { ApnsTokenBridge } from "@/lib/apnsTokenBridge";
import { getDeviceLocaleTag } from "@/lib/deviceLocale";
import { pushLog, type PushLogContext } from "@/lib/push/pushLogger";
import { navigateCustomerFromPushUrl } from "@/lib/customerPushDeepLink";

const STORAGE_KEY = "native-push-token";
const REGISTER_TIMEOUT_MS = 45_000;
const REGISTER_POLL_MS = 400;

type NativeAvailability = {
  isNative: boolean;
  platform: "android" | "ios" | "web";
  source?: "capacitor" | "apns-token" | "cached-token";
};

type NativePushPermission = "granted" | "denied" | "prompt" | "unknown";

export type NativePushRuntimeDiagnostics = {
  environment: "native" | "web";
  platform: "ios" | "android" | "web";
  bridgeReady: boolean;
  permission: NativePushPermission;
  hasCachedToken: boolean;
  tokenPreview: string | null;
  lastRegistrationError: string | null;
  nativeBridge?: {
    appDelegateReceived: boolean;
    jsDelivered: boolean;
    tokenPreview: string | null;
  };
  supabaseSaved: boolean;
};

let bridgeReady = false;
let bridgeInitPromise: Promise<void> | null = null;
let appResumeHooked = false;
let cachedToken: string | null = null;
let lastRegistrationError: string | null = null;
let lastSupabaseSaveOk = false;
let apnsInjectionHooked = false;
const NATIVE_APNS_WINDOW_KEY = "__kebabturcoNativeApnsToken";
const tokenWaiters = new Set<{
  resolve: (token: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function logNative(
  level: "info" | "warn" | "error",
  message: string,
  details?: Record<string, unknown>,
) {
  pushLog("staff", "native_register", level, message, details);
}

function getCapacitorBridgeAvailabilitySync(): NativeAvailability | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const platform = (cap.getPlatform?.() ?? "web") as "android" | "ios" | "web";
  return { isNative: true, platform, source: "capacitor" };
}

async function getCapacitorBridgeAvailability(): Promise<NativeAvailability | null> {
  const sync = getCapacitorBridgeAvailabilitySync();
  if (sync) return sync;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform() as "android" | "ios" | "web";
    return { isNative: true, platform, source: "capacitor" };
  } catch {
    return null;
  }
}

function getNativeTokenSignalAvailability(): NativeAvailability | null {
  if (typeof window === "undefined") return null;
  if (readWindowInjectedApnsToken()) return { isNative: true, platform: "ios", source: "apns-token" };
  if (readCachedNativePushToken()) return { isNative: true, platform: "ios", source: "cached-token" };
  return null;
}

function getCapacitorAvailabilitySync(): NativeAvailability | null {
  return getCapacitorBridgeAvailabilitySync() ?? getNativeTokenSignalAvailability();
}

async function getCapacitorAvailability(): Promise<NativeAvailability> {
  const sync = getCapacitorAvailabilitySync();
  if (sync) return sync;
  const bridge = await getCapacitorBridgeAvailability();
  if (bridge) return bridge;
  return getNativeTokenSignalAvailability() ?? { isNative: false, platform: "web" };
}

export async function isNativePushAvailable(): Promise<boolean> {
  const { isNative, platform } = await getCapacitorAvailability();
  return isNative && (platform === "android" || platform === "ios");
}

/** Versão síncrona, útil em guards de UI antes do import dinâmico do Capacitor. */
export function isNativePushAvailableSync(): boolean {
  const sync = getCapacitorAvailabilitySync();
  return Boolean(sync && (sync.platform === "android" || sync.platform === "ios"));
}

export function readCachedNativePushToken(): string | null {
  if (cachedToken) return cachedToken;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) cachedToken = stored;
    return stored;
  } catch {
    return null;
  }
}

/** Limpa token em cache, usar antes de voltar a registar após erro da Apple. */
export function clearCachedNativePushToken(): void {
  cachedToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  logNative("info", "Token local apagado");
}

export async function getNativePushPermission(): Promise<NativePushPermission> {
  if (!(await isNativePushAvailable())) return "unknown";
  if (!(await getCapacitorBridgeAvailability())) {
    return readCachedNativePushToken() || readWindowInjectedApnsToken() ? "granted" : "unknown";
  }
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") return "granted";
    if (perm.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

export async function getNativePushRuntimeDiagnostics(): Promise<NativePushRuntimeDiagnostics> {
  const { isNative, platform } = await getCapacitorAvailability();
  const permission = await getNativePushPermission();
  const token = readCachedNativePushToken();
  let nativeBridge: NativePushRuntimeDiagnostics["nativeBridge"];

  if (isNative && platform === "ios") {
    try {
      const diag = await ApnsTokenBridge.getBridgeDiagnostics();
      nativeBridge = {
        appDelegateReceived: Boolean(diag.appDelegateReceived),
        jsDelivered: Boolean(diag.jsDelivered),
        tokenPreview:
          typeof diag.tokenPreview === "string"
            ? diag.tokenPreview
            : token
              ? `${token.slice(0, 8)}…${token.slice(-4)}`
              : null,
      };
    } catch {
      nativeBridge = undefined;
    }
  }

  return {
    environment: isNative ? "native" : "web",
    platform: platform === "android" || platform === "ios" ? platform : "web",
    bridgeReady,
    permission,
    hasCachedToken: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : null,
    lastRegistrationError,
    nativeBridge,
    supabaseSaved: lastSupabaseSaveOk,
  };
}

function notifyTokenWaiters(token: string) {
  for (const waiter of tokenWaiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(token);
    tokenWaiters.delete(waiter);
  }
}

function notifyTokenWaitersError(message: string) {
  lastRegistrationError = message;
  for (const waiter of tokenWaiters) {
    clearTimeout(waiter.timer);
    waiter.reject(new Error(message));
    tokenWaiters.delete(waiter);
  }
}

function rememberNativeToken(token: string) {
  const normalized = token.replace(/[<>\s]/g, "").toLowerCase();
  cachedToken = normalized;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
  logNative("info", "Token guardado no telemóvel", {
    tokenPreview: `${normalized.slice(0, 8)}…${normalized.slice(-4)}`,
  });
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  const { platform } = await getCapacitorAvailability();
  if (platform !== "android") return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.createChannel({
      id: "staff_orders",
      name: "Pedidos da equipa",
      description: "Alertas de novos pedidos no painel",
      importance: 5,
      sound: "default",
      vibration: true,
      visibility: 1,
    });
  } catch (e) {
    logNative("warn", "Canal Android não criado", { error: String(e) });
  }
}

function handleForegroundPush(notification: { data?: Record<string, unknown>; tag?: string }) {
  const tag = String(notification?.data?.tag ?? notification?.tag ?? "");
  if (!tag.startsWith("staff-new-order-")) return;
  const orderId = tag.replace("staff-new-order-", "");
  if (!orderId) return;
  void import("@/lib/panelAlerts").then(({ registerNewPendingOrderAlert }) => {
    registerNewPendingOrderAlert(orderId);
  });
}

function logCustomerNative(
  context: PushLogContext,
  level: "info" | "warn" | "error",
  message: string,
  details?: Record<string, unknown>,
) {
  pushLog(context, "native_register", level, message, details);
}

async function persistTokenToBackend(
  token: string,
  storeId: string,
  platform: "android" | "ios",
  opts?: { customerPhone?: string; orderId?: string | null; logContext?: PushLogContext },
) {
  const cleanToken = token.replace(/[<>\s]/g, "").toLowerCase();
  const customerPhone = opts?.customerPhone ?? "__staff__";
  const logContext = opts?.logContext ?? "staff";
  const log =
    logContext === "staff"
      ? (level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) =>
          logNative(level, message, details)
      : (level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>) =>
          logCustomerNative(logContext, level, message, details);

  log("info", "A gravar token no servidor", { storeId, platform, customerPhone, orderId: opts?.orderId });
  const { error } = await supabase.rpc("register_native_push_subscription", {
    _store_id: storeId,
    _fcm_token: cleanToken,
    _platform: platform,
    _customer_phone: customerPhone,
    _order_id: opts?.orderId ?? undefined,
    _device_locale: getDeviceLocaleTag(),
  });
  if (error) {
    lastSupabaseSaveOk = false;
    log("error", "Servidor recusou o token", { code: error.code, message: error.message });
    throw error;
  }
  rememberNativeToken(cleanToken);
  lastSupabaseSaveOk = true;
  log("info", "Token gravado no servidor com sucesso");
}

function readWindowInjectedApnsToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = (window as unknown as Record<string, unknown>)[NATIVE_APNS_WINDOW_KEY];
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw.replace(/[<>\s]/g, "").toLowerCase();
}

function hookApnsTokenInjectionEvent(): void {
  if (apnsInjectionHooked || typeof window === "undefined") return;
  apnsInjectionHooked = true;
  window.addEventListener("kebabturco-apns-token", (event) => {
    const detail = (event as CustomEvent<{ token?: string; source?: string }>).detail;
    if (!detail?.token) return;
    logNative("info", "Token recebido da ponte nativa iOS", { source: detail.source ?? "appdelegate" });
    lastRegistrationError = null;
    rememberNativeToken(detail.token);
    notifyTokenWaiters(detail.token);
    void ApnsTokenBridge.markJsReceived().catch(() => null);
  });
}

async function fetchTokenFromNativeBridge(): Promise<string | null> {
  const injected = readWindowInjectedApnsToken();
  if (injected) {
    logNative("info", "Token lido da ponte injectada no ecrã");
    return injected;
  }

  const { platform } = await getCapacitorAvailability();
  if (platform !== "ios") return null;

  try {
    const saved = await ApnsTokenBridge.getSavedApnsToken();
    if (saved.token) {
      const normalized = saved.token.replace(/[<>\s]/g, "").toLowerCase();
      logNative("info", "Token lido do armazenamento nativo iOS");
      await ApnsTokenBridge.markJsReceived().catch(() => null);
      return normalized;
    }

    await ApnsTokenBridge.redeliverToJavaScript().catch(() => null);
    await sleep(600);
    const retry = await ApnsTokenBridge.getSavedApnsToken();
    if (retry.token) {
      const normalized = retry.token.replace(/[<>\s]/g, "").toLowerCase();
      logNative("info", "Token lido após reenvio da ponte nativa");
      await ApnsTokenBridge.markJsReceived().catch(() => null);
      return normalized;
    }
  } catch (e) {
    logNative("warn", "Ponte APNs nativa indisponível", { error: String(e) });
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForNativeToken(timeoutMs = REGISTER_TIMEOUT_MS): Promise<string> {
  const existing = readCachedNativePushToken();
  if (existing) {
    logNative("info", "Token já estava em cache local");
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const waiter = {
      resolve: (token: string) => {
        clearTimeout(waiter.timer);
        if (pollTimer) clearInterval(pollTimer);
        tokenWaiters.delete(waiter);
        resolve(token);
      },
      reject: (err: Error) => {
        clearTimeout(waiter.timer);
        if (pollTimer) clearInterval(pollTimer);
        tokenWaiters.delete(waiter);
        reject(err);
      },
      timer: null as unknown as ReturnType<typeof setTimeout>,
    };

    const pollTimer = setInterval(() => {
      const polled = readCachedNativePushToken();
      if (polled) {
        logNative("info", "Token recebido (detecção por cache)");
        waiter.resolve(polled);
        return;
      }
      void fetchTokenFromNativeBridge().then((bridgeToken) => {
        if (!bridgeToken) return;
        rememberNativeToken(bridgeToken);
        logNative("info", "Token recebido (ponte nativa iOS)");
        waiter.resolve(bridgeToken);
      });
    }, REGISTER_POLL_MS);

    waiter.timer = setTimeout(() => {
      clearInterval(pollTimer);
      tokenWaiters.delete(waiter);
      reject(
        new Error(
          "O telemóvel não devolveu o token a tempo. Feche a app por completo (deslize para cima e remova), abra outra vez, e em Definições do iPhone confirme que Notificações estão permitidas para Kebab Turco.",
        ),
      );
    }, timeoutMs);

    tokenWaiters.add(waiter);
  });
}

async function attachPushListeners(): Promise<void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await PushNotifications.addListener("registration", (t) => {
    logNative("info", "Evento registration recebido", {
      tokenPreview: `${String(t.value).slice(0, 8)}…`,
    });
    lastRegistrationError = null;
    rememberNativeToken(t.value);
    notifyTokenWaiters(t.value);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    const message = String(err?.error ?? "Erro ao registar push no telemóvel");
    logNative("error", "Evento registrationError", { message, raw: err });
    notifyTokenWaitersError(message);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    handleForegroundPush(notification as { data?: Record<string, unknown>; tag?: string });
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
    const data = (a?.notification?.data ?? {}) as Record<string, unknown>;
    const url = typeof data.url === "string" ? data.url : undefined;
    if (url && typeof window !== "undefined") {
      navigateCustomerFromPushUrl(url);
    }
  });
}

/** Só para casos extremos, no iPhone apagar listeners impede voltar a receber o token. */
async function resetNativePushBridge(): Promise<void> {
  logNative("warn", "Reinício completo da ligação push (evitar no iPhone)");
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
  } catch {
    /* ignore */
  }
  bridgeReady = false;
  bridgeInitPromise = null;
}

/** Arranca os listeners cedo, evita perder o token no iPhone. */
async function hookNativePushAppResume(): Promise<void> {
  if (appResumeHooked || !(await isNativePushAvailable())) return;
  appResumeHooked = true;
  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      void refreshNativePushTokenIfNeeded();
    });
  } catch {
    /* ignore */
  }
}

async function refreshNativePushTokenIfNeeded(): Promise<void> {
  if (!(await isNativePushAvailable())) return;
  await initNativePushBridge();
  if ((await getNativePushPermission()) !== "granted") return;
  if (readCachedNativePushToken()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    logNative("info", "register() ao reabrir a app (ainda sem token)");
    await PushNotifications.register();
  } catch (e) {
    logNative("warn", "register() ao reabrir falhou", { error: String(e) });
  }
}

export async function initNativePushBridge(): Promise<void> {
  hookApnsTokenInjectionEvent();

  if (!(await isNativePushAvailable())) return;
  if (bridgeInitPromise) return bridgeInitPromise;

  bridgeInitPromise = (async () => {
    if (bridgeReady) return;
    const { platform, source } = await getCapacitorAvailability();
    const capacitorBridge = await getCapacitorBridgeAvailability();
    logNative("info", "A iniciar bridge push nativo", { platform, source, capacitorBridge: Boolean(capacitorBridge) });

    const bridgeToken = await fetchTokenFromNativeBridge();
    if (bridgeToken) {
      rememberNativeToken(bridgeToken);
    }

    if (!capacitorBridge) {
      // Em alguns builds iOS com site remoto, a WebView mantém o token APNs injectado pelo AppDelegate,
      // mas o runtime JS do Capacitor pode chegar tarde ou não expor a bridge. Nessa situação ainda é
      // seguro registar o token já autorizado no backend, em vez de mostrar falsamente "computador/browser".
      bridgeReady = true;
      await hookNativePushAppResume();
      return;
    }

    const { PushNotifications } = await import("@capacitor/push-notifications");
    await ensureAndroidNotificationChannel();
    await attachPushListeners();
    bridgeReady = true;
    await hookNativePushAppResume();

    const perm = await PushNotifications.checkPermissions();
    logNative("info", "Permissão actual", { receive: perm.receive });
    if (perm.receive === "granted") {
      try {
        logNative("info", "register() no arranque (permissão já concedida)");
        await PushNotifications.register();
      } catch (e) {
        logNative("warn", "register() no arranque falhou", { error: String(e) });
      }
    }
  })();

  return bridgeInitPromise;
}

export async function getNativeDevicePushStatus(): Promise<{
  ready: boolean;
  permission: NativePushPermission;
  tokenPreview: string | null;
  platform: "android" | "ios" | "web";
}> {
  const { platform } = await getCapacitorAvailability();
  const permission = await getNativePushPermission();
  const token = readCachedNativePushToken();
  return {
    ready: permission === "granted" && Boolean(token),
    permission,
    tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : null,
    platform: platform === "android" || platform === "ios" ? platform : "web",
  };
}

async function requestNativePermission(): Promise<{
  granted: boolean;
  receive: string;
}> {
  if (!(await getCapacitorBridgeAvailability())) {
    const token = readCachedNativePushToken() ?? readWindowInjectedApnsToken();
    if (token) {
      rememberNativeToken(token);
      return { granted: true, receive: "granted" };
    }
    return { granted: false, receive: "native-bridge-unavailable" };
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.checkPermissions();
  logNative("info", "checkPermissions", { receive: perm.receive });
  if (perm.receive === "granted") return { granted: true, receive: perm.receive };

  const req = await PushNotifications.requestPermissions();
  logNative("info", "requestPermissions", { receive: req.receive });
  if (req.receive === "granted") {
    try {
      logNative("info", "register() após permissão concedida");
      await PushNotifications.register();
    } catch (e) {
      logNative("warn", "register() após permissão falhou", { error: String(e) });
    }
  }
  return { granted: req.receive === "granted", receive: req.receive };
}

/** Pedir só permissão (para ligar o interruptor logo após o utilizador aceitar). */
export async function requestNativePushPermissionOnly(): Promise<{
  granted: boolean;
  receive: string;
}> {
  if (!(await isNativePushAvailable())) {
    return { granted: false, receive: "unsupported" };
  }
  await initNativePushBridge();
  return requestNativePermission();
}

async function triggerRegisterWithRetries(platform: "ios" | "android"): Promise<void> {
  if (!(await getCapacitorBridgeAvailability())) {
    const token = readCachedNativePushToken() ?? readWindowInjectedApnsToken();
    if (token) {
      rememberNativeToken(token);
      return;
    }
    throw new Error("A ponte nativa do iPhone não ficou disponível para pedir um novo token.");
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  if (platform === "ios") {
    await sleep(600);
  }
  const attempts = platform === "ios" ? 5 : 1;
  for (let i = 0; i < attempts; i++) {
    logNative("info", "Pedido de registo ao telemóvel", { attempt: i + 1, attempts });
    await PushNotifications.register();
    if (readCachedNativePushToken()) return;
    if (i < attempts - 1) await sleep(platform === "ios" ? 2000 * (i + 1) : 1500);
  }
}

/** Pedir permissão + registar token FCM/APNs. Idempotente. */
export async function registerNativeStaffPush(
  storeId: string,
  opts?: { forceRefresh?: boolean; skipPermissionRequest?: boolean },
): Promise<{
  ok: boolean;
  reason?: string;
  token?: string;
}> {
  const { isNative, platform } = await getCapacitorAvailability();
  logNative("info", "registerNativeStaffPush iniciado", {
    isNative,
    platform,
    forceRefresh: Boolean(opts?.forceRefresh),
  });

  if (!isNative || platform === "web") {
    return { ok: false, reason: "not-native" };
  }

  const nativePlatform = platform as "android" | "ios";
  await initNativePushBridge();

  try {
    if (opts?.forceRefresh) {
      const cachedForRefresh = readCachedNativePushToken();
      if (nativePlatform === "ios") {
        // No iPhone: nunca apagar listeners nem o token local, só voltar a sincronizar.
        logNative("info", "Actualização suave (iPhone)", {
          hasCachedToken: Boolean(cachedForRefresh),
        });
        if (cachedForRefresh) {
          await persistTokenToBackend(cachedForRefresh, storeId, nativePlatform);
          return { ok: true, token: cachedForRefresh };
        }
      } else {
        clearCachedNativePushToken();
        await resetNativePushBridge();
        await initNativePushBridge();
      }
    }

    const { granted, receive } = opts?.skipPermissionRequest
      ? { granted: true, receive: "granted" }
      : await requestNativePermission();
    if (!granted) {
      return {
        ok: false,
        reason:
          receive === "denied"
            ? "Permissão de notificações negada no telemóvel, active em Definições → Kebab Turco → Notificações."
            : "Permissão de notificações não concedida, tente outra vez.",
      };
    }

    const cached = readCachedNativePushToken();
    if (cached && !opts?.forceRefresh) {
      try {
        await persistTokenToBackend(cached, storeId, nativePlatform);
        return { ok: true, token: cached };
      } catch (e) {
        logNative("warn", "Token em cache não gravou no servidor, a pedir novo", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    let token = readCachedNativePushToken();
    if (!token) {
      const tokenPromise = waitForNativeToken();
      await triggerRegisterWithRetries(nativePlatform);

      const bridgeFallback = await fetchTokenFromNativeBridge();
      if (bridgeFallback) {
        rememberNativeToken(bridgeFallback);
        notifyTokenWaiters(bridgeFallback);
      }

      token = readCachedNativePushToken() ?? (await tokenPromise);
    }
    await persistTokenToBackend(token, storeId, nativePlatform);
    return { ok: true, token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logNative("error", "Registo nativo falhou", { message });
    if (/login necessário/i.test(message)) {
      return { ok: false, reason: "Tem de estar com sessão da equipa iniciada para registar alertas." };
    }
    if (/sem permissão/i.test(message)) {
      return { ok: false, reason: "Sem permissão para esta loja, escolha a unidade correcta." };
    }
    if (lastRegistrationError) {
      return { ok: false, reason: lastRegistrationError };
    }
    return { ok: false, reason: message };
  }
}

/** Pedir permissão + registar token FCM/APNs para cliente (promoções ou estado do pedido). */
export async function registerNativeCustomerPush(
  storeId: string,
  opts: {
    customerPhone: string;
    orderId?: string | null;
    forceRefresh?: boolean;
    skipPermissionRequest?: boolean;
    logContext?: PushLogContext;
  },
): Promise<{
  ok: boolean;
  reason?: string;
  token?: string;
}> {
  const logContext = opts.logContext ?? (opts.orderId ? "order" : "customer_marketing");
  const { isNative, platform } = await getCapacitorAvailability();
  logCustomerNative(logContext, "info", "registerNativeCustomerPush iniciado", {
    isNative,
    platform,
    customerPhone: opts.customerPhone,
    orderId: opts.orderId,
  });

  if (!isNative || platform === "web") {
    return { ok: false, reason: "not-native" };
  }

  const nativePlatform = platform as "android" | "ios";
  await initNativePushBridge();

  try {
    if (opts.forceRefresh) {
      const cachedForRefresh = readCachedNativePushToken();
      if (nativePlatform === "ios" && cachedForRefresh) {
        await persistTokenToBackend(cachedForRefresh, storeId, nativePlatform, {
          customerPhone: opts.customerPhone,
          orderId: opts.orderId,
          logContext,
        });
        return { ok: true, token: cachedForRefresh };
      }
      if (nativePlatform === "android") {
        clearCachedNativePushToken();
        await resetNativePushBridge();
        await initNativePushBridge();
      }
    }

    const { granted, receive } = opts.skipPermissionRequest
      ? { granted: true, receive: "granted" }
      : await requestNativePermission();
    if (!granted) {
      return {
        ok: false,
        reason:
          receive === "denied"
            ? "Permissão de notificações negada no telemóvel, active em Definições → Kebab Turco → Notificações."
            : "Permissão de notificações não concedida, tente outra vez.",
      };
    }

    const cached = readCachedNativePushToken();
    if (cached && !opts.forceRefresh) {
      try {
        await persistTokenToBackend(cached, storeId, nativePlatform, {
          customerPhone: opts.customerPhone,
          orderId: opts.orderId,
          logContext,
        });
        return { ok: true, token: cached };
      } catch (e) {
        logCustomerNative(logContext, "warn", "Token em cache não gravou no servidor, a pedir novo", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    let token = readCachedNativePushToken();
    if (!token) {
      const tokenPromise = waitForNativeToken();
      await triggerRegisterWithRetries(nativePlatform);

      const bridgeFallback = await fetchTokenFromNativeBridge();
      if (bridgeFallback) {
        rememberNativeToken(bridgeFallback);
        notifyTokenWaiters(bridgeFallback);
      }

      token = readCachedNativePushToken() ?? (await tokenPromise);
    }
    await persistTokenToBackend(token, storeId, nativePlatform, {
      customerPhone: opts.customerPhone,
      orderId: opts.orderId,
      logContext,
    });
    return { ok: true, token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logCustomerNative(logContext, "error", "Registo nativo cliente falhou", { message });
    if (lastRegistrationError) {
      return { ok: false, reason: lastRegistrationError };
    }
    return { ok: false, reason: message };
  }
}

/** Remove registo push nativo deste telemóvel no servidor e localmente. */
export async function unregisterNativeStaffPush(): Promise<void> {
  const token = readCachedNativePushToken();
  clearCachedNativePushToken();
  if (token) {
    const endpoint = `fcm://${token.replace(/[<>\s]/g, "").toLowerCase()}`;
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
  // Mantém listeners activos, no iPhone apagar a ponte impede voltar a obter token.
  logNative("info", "Registo push desactivado neste telemóvel");
}

/** Para usar no boot do painel, re-regista se o utilizador já tinha activado. */
export async function restoreNativeStaffPushIfPossible(storeId: string): Promise<void> {
  if (!(await isNativePushAvailable())) return;
  const { isStaffPushEnabled } = await import("@/lib/staffPush");
  if (!isStaffPushEnabled()) return;
  await registerNativeStaffPush(storeId);
}

/** Mantém ecrã do tablet ligado enquanto painel operacional está aberto. */
export async function enableKeepAwake(): Promise<void> {
  try {
    const { isNative } = await getCapacitorAvailability();
    if (isNative) {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      await KeepAwake.keepAwake();
      return;
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<unknown> } })
        .wakeLock.request("screen")
        .catch(() => null);
    }
  } catch {
    /* ignore */
  }
}

export async function disableKeepAwake(): Promise<void> {
  try {
    const { isNative } = await getCapacitorAvailability();
    if (isNative) {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      await KeepAwake.allowSleep();
    }
  } catch {
    /* ignore */
  }
}
