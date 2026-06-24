/**
 * Registo de push nativo (FCM Android / APNs iOS) via Capacitor.
 * Só corre dentro do APK/IPA; no browser web usa-se Web Push VAPID.
 */
import { supabase } from "@/integrations/supabase/client";
import { pushLog } from "@/lib/push/pushLogger";

const STORAGE_KEY = "native-push-token";
const REGISTER_TIMEOUT_MS = 45_000;
const REGISTER_POLL_MS = 400;

type NativeAvailability = {
  isNative: boolean;
  platform: "android" | "ios" | "web";
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
};

let bridgeReady = false;
let bridgeInitPromise: Promise<void> | null = null;
let cachedToken: string | null = null;
let lastRegistrationError: string | null = null;
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

async function getCapacitorAvailability(): Promise<NativeAvailability> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform() as "android" | "ios" | "web";
    return { isNative: Capacitor.isNativePlatform(), platform };
  } catch {
    return { isNative: false, platform: "web" };
  }
}

export async function isNativePushAvailable(): Promise<boolean> {
  const { isNative, platform } = await getCapacitorAvailability();
  return isNative && (platform === "android" || platform === "ios");
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

/** Limpa token em cache — usar antes de voltar a registar após erro da Apple. */
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
  return {
    environment: isNative ? "native" : "web",
    platform: platform === "android" || platform === "ios" ? platform : "web",
    bridgeReady,
    permission,
    hasCachedToken: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : null,
    lastRegistrationError,
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
  void import("@/lib/panelAlerts").then(({ registerNewPendingOrderAlert, playNewOrderAlert }) => {
    registerNewPendingOrderAlert(orderId);
    playNewOrderAlert(orderId);
  });
}

async function persistTokenToBackend(token: string, storeId: string, platform: "android" | "ios") {
  const cleanToken = token.replace(/[<>\s]/g, "").toLowerCase();
  logNative("info", "A gravar token no servidor", { storeId, platform });
  const { error } = await supabase.rpc("register_native_push_subscription", {
    _store_id: storeId,
    _fcm_token: cleanToken,
    _platform: platform,
    _customer_phone: "__staff__",
  });
  if (error) {
    logNative("error", "Servidor recusou o token", { code: error.code, message: error.message });
    throw error;
  }
  rememberNativeToken(cleanToken);
  logNative("info", "Token gravado no servidor com sucesso");
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
      }
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
      const path = url.startsWith("/") ? url : `/${url}`;
      if (window.location.pathname !== path) {
        window.history.pushState(null, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  });
}

async function resetNativePushBridge(): Promise<void> {
  logNative("info", "A reiniciar ligação push nativa");
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
  } catch {
    /* ignore */
  }
  bridgeReady = false;
  bridgeInitPromise = null;
}

/** Arranca os listeners cedo — evita perder o token no iPhone. */
export async function initNativePushBridge(): Promise<void> {
  if (!(await isNativePushAvailable())) return;
  if (bridgeInitPromise) return bridgeInitPromise;

  bridgeInitPromise = (async () => {
    if (bridgeReady) return;
    const { platform } = await getCapacitorAvailability();
    logNative("info", "A iniciar bridge push nativo", { platform });

    const { PushNotifications } = await import("@capacitor/push-notifications");
    await ensureAndroidNotificationChannel();
    await attachPushListeners();
    bridgeReady = true;

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
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.checkPermissions();
  logNative("info", "checkPermissions", { receive: perm.receive });
  if (perm.receive === "granted") return { granted: true, receive: perm.receive };

  const req = await PushNotifications.requestPermissions();
  logNative("info", "requestPermissions", { receive: req.receive });
  return { granted: req.receive === "granted", receive: req.receive };
}

async function triggerRegisterWithRetries(platform: "ios" | "android"): Promise<void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const attempts = platform === "ios" ? 3 : 1;
  for (let i = 0; i < attempts; i++) {
    logNative("info", "PushNotifications.register() chamado", { attempt: i + 1, attempts });
    await PushNotifications.register();
    if (readCachedNativePushToken()) return;
    if (i < attempts - 1) await sleep(1500 * (i + 1));
  }
}

/** Pedir permissão + registar token FCM/APNs. Idempotente. */
export async function registerNativeStaffPush(
  storeId: string,
  opts?: { forceRefresh?: boolean },
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
      clearCachedNativePushToken();
      await resetNativePushBridge();
      await initNativePushBridge();
    }

    const { granted, receive } = await requestNativePermission();
    if (!granted) {
      return {
        ok: false,
        reason:
          receive === "denied"
            ? "Permissão de notificações negada no telemóvel — active em Definições → Kebab Turco → Notificações."
            : "Permissão de notificações não concedida — tente outra vez.",
      };
    }

    const cached = readCachedNativePushToken();
    if (cached && !opts?.forceRefresh) {
      try {
        await persistTokenToBackend(cached, storeId, nativePlatform);
        return { ok: true, token: cached };
      } catch (e) {
        logNative("warn", "Token em cache não gravou no servidor — a pedir novo", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const tokenPromise = waitForNativeToken();
    await triggerRegisterWithRetries(nativePlatform);
    const token = await tokenPromise;
    await persistTokenToBackend(token, storeId, nativePlatform);
    return { ok: true, token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logNative("error", "Registo nativo falhou", { message });
    if (/login necessário/i.test(message)) {
      return { ok: false, reason: "Tem de estar com sessão da equipa iniciada para registar alertas." };
    }
    if (/sem permissão/i.test(message)) {
      return { ok: false, reason: "Sem permissão para esta loja — escolha a unidade correcta." };
    }
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
  await resetNativePushBridge();
}

/** Para usar no boot do painel — re-regista se o utilizador já tinha activado. */
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
