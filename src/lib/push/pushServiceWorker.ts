import { pushLog, type PushLogContext } from "@/lib/push/pushLogger";

export const PUSH_HANDLER_SW_PATH = "/push-handler.js";

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
    pushLog("system", "service_worker", "error", "Registo do service worker falhou", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
