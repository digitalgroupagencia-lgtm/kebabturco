import { supabase } from "@/integrations/supabase/client";
import { ensureStaffPushServiceWorker } from "@/lib/staffPush";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";

/** Marca subscrições push de clientes que aceitaram promoções no menu (sem pedido). */
export const CUSTOMER_MARKETING_PUSH_TAG = "__marketing__";

export const CUSTOMER_MARKETING_PUSH_KEY = "customer-marketing-push-opted";
export const CUSTOMER_MARKETING_PROMPT_SESSION_KEY = "customer-marketing-prompt-shown";

const VAPID_PUBLIC = getVapidPublicKey();

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

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
    VAPID_PUBLIC &&
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
  if (!VAPID_PUBLIC) {
    return { ok: false, error: "Notificações não disponíveis neste momento" };
  }
  if (!storeId) {
    return { ok: false, error: "Loja inválida" };
  }

  try {
    await ensureStaffPushServiceWorker();

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Permissão de notificações negada" };
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "Subscrição inválida" };
    }

    const { error: dbErr } = await supabase.rpc("register_push_subscription", {
      _store_id: storeId,
      _order_id: null,
      _customer_phone: CUSTOMER_MARKETING_PUSH_TAG,
      _endpoint: json.endpoint,
      _p256dh: json.keys.p256dh,
      _auth: json.keys.auth,
    });

    if (dbErr) throw dbErr;
    setCustomerMarketingPushOpted(true);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao activar notificações",
    };
  }
}
