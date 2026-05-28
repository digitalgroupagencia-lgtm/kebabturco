import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
export const STAFF_PUSH_ENABLED_KEY = "panel-staff-push-enabled";
export const PUSH_HANDLER_SW_PATH = "/push-handler.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

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

export function isStaffPushSupported(): boolean {
  return Boolean(
    VAPID_PUBLIC &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

export function isPushHandlerRegistration(reg: ServiceWorkerRegistration): boolean {
  const scriptUrl = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? "";
  return scriptUrl.includes(PUSH_HANDLER_SW_PATH);
}

/** Regista SW de push (preservado no boot da app). */
export async function ensureStaffPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistrations();
    const pushReg = existing.find(isPushHandlerRegistration);
    if (pushReg) {
      await navigator.serviceWorker.ready;
      return pushReg;
    }
    const reg = await navigator.serviceWorker.register(PUSH_HANDLER_SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn("[staffPush] service worker register failed", err);
    return null;
  }
}

/** Subscrição push da equipa do restaurante (store_id, sem order_id). */
export async function subscribeStaffPush(storeId: string): Promise<{ ok: boolean; error?: string }> {
  if (!VAPID_PUBLIC) {
    return { ok: false, error: "Push não configurado no servidor" };
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
      return { ok: false, error: "Subscrição push inválida" };
    }

    const { error: dbErr } = await supabase.rpc("register_push_subscription", {
      _store_id: storeId,
      _order_id: null,
      _customer_phone: null,
      _endpoint: json.endpoint,
      _p256dh: json.keys.p256dh,
      _auth: json.keys.auth,
    });

    if (dbErr) throw dbErr;
    setStaffPushEnabled(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao activar push" };
  }
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
    }
  } catch {
    /* ignore */
  }
}

/** Re-regista push se o utilizador já tinha activado (ex.: após reload). */
export async function restoreStaffPushIfEnabled(storeId: string): Promise<void> {
  if (!storeId || !isStaffPushEnabled() || !isStaffPushSupported()) return;
  if (Notification.permission !== "granted") return;
  await subscribeStaffPush(storeId);
}
