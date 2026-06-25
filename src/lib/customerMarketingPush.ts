import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";
import {
  isNativePushAvailable,
  isNativePushAvailableSync,
  registerNativeCustomerPush,
} from "@/services/nativePush";

/** Marca subscrições push de clientes que aceitaram promoções no menu (sem pedido). */
export const CUSTOMER_MARKETING_PUSH_TAG = "__marketing__";

export const CUSTOMER_MARKETING_PUSH_KEY = "customer-marketing-push-opted";
export const CUSTOMER_MARKETING_PROMPT_SESSION_KEY = "customer-marketing-prompt-shown";

export function isCustomerMarketingPushOpted(): boolean {
  try {
    return localStorage.getItem(CUSTOMER_MARKETING_PUSH_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCustomerMarketingPushOpted(opted: boolean) {
  try {
    if (opted) localStorage.setItem(CUSTOMER_MARKETING_PUSH_KEY, "1");
    else localStorage.removeItem(CUSTOMER_MARKETING_PUSH_KEY);
  } catch {
    /* ignore */
  }
}

export function markCustomerMarketingPromptShown() {
  try {
    sessionStorage.setItem(CUSTOMER_MARKETING_PROMPT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldPromptCustomerMarketingPush(): boolean {
  try {
    if (sessionStorage.getItem(CUSTOMER_MARKETING_PROMPT_SESSION_KEY)) return false;
  } catch {
    /* ignore */
  }
  if (isCustomerMarketingPushOpted()) return false;
  if (!isNativePushAvailableSync()) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") return false;
  }
  return true;
}

function isWebPushSupported(): boolean {
  return Boolean(
    getVapidPublicKey() &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

/** Browser/PWA ou app nativa iOS/Android (Capacitor). */
export function isCustomerMarketingPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativePushAvailableSync()) return true;
  return isWebPushSupported();
}

export async function isCustomerMarketingPushSupportedAsync(): Promise<boolean> {
  if (await isNativePushAvailable()) return true;
  return isWebPushSupported();
}

/** Subscrição push para promoções (menu, antes de pedir). */
export async function subscribeCustomerMarketingPush(
  storeId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (await isNativePushAvailable()) {
    const native = await registerNativeCustomerPush(storeId, {
      customerPhone: CUSTOMER_MARKETING_PUSH_TAG,
      logContext: "customer_marketing",
    });
    if (native.ok) {
      setCustomerMarketingPushOpted(true);
      return { ok: true };
    }
    if (native.reason === "not-native") {
      /* fall through to web */
    } else {
      return { ok: false, error: native.reason };
    }
  }

  const result = await subscribePushWithLogging({
    context: "customer_marketing",
    storeId,
    orderId: null,
    customerPhone: CUSTOMER_MARKETING_PUSH_TAG,
    onOptIn: () => setCustomerMarketingPushOpted(true),
    userMessageDenied: "Permissão de notificações negada",
    userMessageUnavailable: "Notificações não disponíveis neste momento",
  });

  return { ok: result.ok, error: result.error };
}
