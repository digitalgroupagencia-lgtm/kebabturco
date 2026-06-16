import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";
import { pushLog } from "@/lib/push/pushLogger";
import { isNativePushAvailable, registerNativeStaffPush } from "@/services/nativePush";

export const STAFF_PUSH_TAG = "__staff__";
export const STAFF_PUSH_ENABLED_KEY = "panel-staff-push-enabled";

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

function isStaffWebPushSupported(): boolean {
  return Boolean(
    getVapidPublicKey() &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

export function isStaffPushSupported(): boolean {
  if (typeof window !== "undefined") {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  }
  return isStaffWebPushSupported();
}

/** Subscrição push da equipa — app nativa (FCM) ou browser (VAPID). */
export async function subscribeStaffPush(storeId: string): Promise<{ ok: boolean; error?: string }> {
  if (await isNativePushAvailable()) {
    const native = await registerNativeStaffPush(storeId);
    if (native.ok) {
      setStaffPushEnabled(true);
      return { ok: true };
    }
    return { ok: false, error: native.reason ?? "Push nativo indisponível" };
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
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      pushLog("staff", "unsubscribe", "info", "Subscrição push da equipa removida", {
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
