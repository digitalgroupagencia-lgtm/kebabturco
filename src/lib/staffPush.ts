import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";
import { pushLog } from "@/lib/push/pushLogger";
import { isNativePushAvailable, registerNativeStaffPush, unregisterNativeStaffPush, isNativePushAvailableSync } from "@/services/nativePush";
import { isCapacitorNativeSync } from "@/lib/capacitorRuntime";

export const STAFF_PUSH_TAG = "__staff__";
export const STAFF_PUSH_ENABLED_KEY = "panel-staff-push-enabled";
export const STAFF_PUSH_PROMPT_SESSION_KEY = "staff-push-prompt-shown";

export {
  PUSH_HANDLER_SW_PATH,
  ensureStaffPushServiceWorker,
  isPushHandlerRegistration,
} from "@/lib/push/pushServiceWorker";

export function isStaffPushEnabled(): boolean {
  try {
    return localStorage.getItem(STAFF_PUSH_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStaffPushEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(STAFF_PUSH_ENABLED_KEY, "1");
    else localStorage.removeItem(STAFF_PUSH_ENABLED_KEY);
  } catch {
    /* ignore */
  }
}

export function markStaffPushPromptShown() {
  try {
    sessionStorage.setItem(STAFF_PUSH_PROMPT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldPromptStaffPush(): boolean {
  try {
    if (sessionStorage.getItem(STAFF_PUSH_PROMPT_SESSION_KEY)) return false;
  } catch {
    /* ignore */
  }
  if (isStaffPushEnabled()) return false;
  return isStaffPushSupported();
}

export function isStaffWebPushSupported(): boolean {
  return Boolean(
    getVapidPublicKey() &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

export type StaffPushClientMode = "native" | "web" | "needs-native-app" | "unsupported";

/** Onde o utilizador está a tentar activar push da equipa. */
export async function getStaffPushClientMode(): Promise<StaffPushClientMode> {
  if (await isNativePushAvailable()) return "native";
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return "needs-native-app";
  }
  if (isStaffWebPushSupported()) return "web";
  return "unsupported";
}

export function isStaffPushSupported(): boolean {
  if (isCapacitorNativeSync() || isNativePushAvailableSync()) return true;
  if (typeof window !== "undefined") {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  }
  return isStaffWebPushSupported();
}

/** Subscrição push da equipa, app nativa (FCM) ou browser (VAPID). */
export async function subscribeStaffPush(
  storeId: string,
  opts?: { forceRefresh?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const mode = await getStaffPushClientMode();
  if (mode === "needs-native-app") {
    return {
      ok: false,
      error:
        "Abra a app Kebab Turco instalada no telemóvel (App Store ou ficheiro de teste). O browser do telemóvel não regista alertas da equipa.",
    };
  }

  if (mode === "native") {
    const native = await registerNativeStaffPush(storeId, opts);
    if (native.ok) {
      setStaffPushEnabled(true);
      return { ok: true };
    }
    if (native.reason === "not-native") {
      return {
        ok: false,
        error: "Esta função só funciona dentro da app instalada no telemóvel.",
      };
    }
    return { ok: false, error: native.reason ?? "Push nativo indisponível" };
  }

  if (mode === "unsupported") {
    return {
      ok: false,
      error: "Push não disponível neste browser, use Chrome no computador ou a app no telemóvel.",
    };
  }

  const result = await subscribePushWithLogging({
    context: "staff",
    storeId,
    orderId: null,
    customerPhone: STAFF_PUSH_TAG,
    onOptIn: () => setStaffPushEnabled(true),
    userMessageDenied: "Permissão de notificações negada",
    userMessageUnavailable: "Push não configurado no servidor",
  });

  return { ok: result.ok, error: result.error };
}

export async function unsubscribeStaffPush(): Promise<void> {
  setStaffPushEnabled(false);
  if (await isNativePushAvailable()) {
    await unregisterNativeStaffPush();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await supabase.rpc("unregister_staff_push_subscription", { _endpoint: endpoint });
      pushLog("staff", "unsubscribe", "info", "Alertas da equipa desactivados (cliente mantido se existir)", {
        endpointPreview: endpoint.slice(0, 48) + "…",
      });
    }
  } catch (e) {
    pushLog("staff", "unsubscribe", "warn", "Erro ao remover subscrição push", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Re-regista push se o utilizador já tinha activado (ex.: após reload). */
export async function restoreStaffPushIfEnabled(storeId: string): Promise<void> {
  if (!storeId || !isStaffPushEnabled()) return;
  if (await isNativePushAvailable()) {
    await registerNativeStaffPush(storeId);
    return;
  }
  if (!isStaffWebPushSupported() || Notification.permission !== "granted") return;
  await subscribeStaffPush(storeId);
}
