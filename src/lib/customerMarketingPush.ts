import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";

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
  if (typeof Notification !== "undefined" && Notification.permission === "granted") return false;
  return true;
}

export function isCustomerMarketingPushSupported(): boolean {
  return Boolean(
    getVapidPublicKey() &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

/** Subscrição push para promoções (menu, antes de pedir). */
export async function subscribeCustomerMarketingPush(
  storeId: string,
): Promise<{ ok: boolean; error?: string }> {
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
