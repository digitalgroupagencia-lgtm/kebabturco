/**
 * Registo de push nativo (FCM Android / APNs iOS) via Capacitor.
 * Só corre dentro do APK; no browser web usa-se Web Push VAPID.
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "native-push-token";
const REGISTER_TIMEOUT_MS = 25_000;

type NativeAvailability = {
  isNative: boolean;
  platform: "android" | "ios" | "web";
};

type NativePushPermission = "granted" | "denied" | "prompt" | "unknown";

let bridgeReady = false;
let cachedToken: string | null = null;
const tokenWaiters = new Set<{
  resolve: (token: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

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

function notifyTokenWaiters(token: string) {
  for (const waiter of tokenWaiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(token);
    tokenWaiters.delete(waiter);
  }
}

function notifyTokenWaitersError(message: string) {
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
    console.warn("[native-push] createChannel failed", e);
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
  const { error } = await supabase.rpc("register_native_push_subscription", {
    _store_id: storeId,
    _fcm_token: cleanToken,
    _platform: platform,
    _customer_phone: "__staff__",
  });
  if (error) throw error;
  rememberNativeToken(cleanToken);
}

function waitForNativeToken(): Promise<string> {
  const existing = readCachedNativePushToken();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      tokenWaiters.delete(waiter);
      reject(
        new Error(
          "O telemóvel não devolveu o token a tempo. Feche a app por completo, abra outra vez e tente de novo.",
        ),
      );
    }, REGISTER_TIMEOUT_MS);

    const waiter = {
      resolve: (token: string) => {
        clearTimeout(timer);
        tokenWaiters.delete(waiter);
        resolve(token);
      },
      reject: (err: Error) => {
        clearTimeout(timer);
        tokenWaiters.delete(waiter);
        reject(err);
      },
      timer,
    };
    tokenWaiters.add(waiter);
  });
}

/** Arranca os listeners cedo — evita perder o token no iPhone. */
export async function initNativePushBridge(): Promise<void> {
  if (bridgeReady || !(await isNativePushAvailable())) return;
  bridgeReady = true;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  await ensureAndroidNotificationChannel();

  await PushNotifications.addListener("registration", (t) => {
    rememberNativeToken(t.value);
    notifyTokenWaiters(t.value);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    const message = String(err?.error ?? "Erro ao registar push no telemóvel");
    console.error("[native-push] registration error", err);
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

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive === "granted") {
    try {
      await PushNotifications.register();
    } catch (e) {
      console.warn("[native-push] early register failed", e);
    }
  }
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
  if (!isNative || platform === "web") return { ok: false, reason: "not-native" };

  await initNativePushBridge();

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) {
      return {
        ok: false,
        reason: "Permissão de notificações negada no telemóvel — active em Definições → Kebab Turco → Notificações.",
      };
    }

    if (opts?.forceRefresh) {
      clearCachedNativePushToken();
    }

    const cached = readCachedNativePushToken();
    if (cached && !opts?.forceRefresh) {
      try {
        await persistTokenToBackend(cached, storeId, platform as "android" | "ios");
        return { ok: true, token: cached };
      } catch (e) {
        console.warn("[native-push] cached token persist failed, retrying register", e);
      }
    }

    const tokenPromise = waitForNativeToken();
    await PushNotifications.register();
    const token = await tokenPromise;
    await persistTokenToBackend(token, storeId, platform as "android" | "ios");
    return { ok: true, token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/login necessário/i.test(message)) {
      return { ok: false, reason: "Tem de estar com sessão da equipa iniciada para registar alertas." };
    }
    if (/sem permissão/i.test(message)) {
      return { ok: false, reason: "Sem permissão para esta loja — escolha a unidade correcta." };
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
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    bridgeReady = false;
  } catch {
    /* ignore */
  }
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
