import {
  ensureStaffPushServiceWorker,
  isPushHandlerRegistration,
  PUSH_HANDLER_SW_PATH,
} from "@/lib/push/pushServiceWorker";
import { pushLog, type PushLogContext } from "@/lib/push/pushLogger";

export type ServiceWorkerDiagnostics = {
  supported: boolean;
  pushManagerSupported: boolean;
  notificationSupported: boolean;
  secureContext: boolean;
  pushHandlerRegistered: boolean;
  pushHandlerScriptUrl: string | null;
  pushHandlerState: ServiceWorkerState | "none";
  pushHandlerScope: string | null;
  totalRegistrations: number;
  registrationError: string | null;
};

export function getBrowserPushSupport(): Pick<
  ServiceWorkerDiagnostics,
  "supported" | "pushManagerSupported" | "notificationSupported" | "secureContext"
> {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator;
  return {
    supported,
    pushManagerSupported: supported && "PushManager" in window,
    notificationSupported: typeof Notification !== "undefined",
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
  };
}

export async function probePushServiceWorker(
  context: PushLogContext = "system",
): Promise<ServiceWorkerDiagnostics> {
  const base = getBrowserPushSupport();

  if (!base.supported) {
    pushLog(context, "service_worker", "warn", "Service worker não suportado neste browser", base);
    return {
      ...base,
      pushHandlerRegistered: false,
      pushHandlerScriptUrl: null,
      pushHandlerState: "none",
      pushHandlerScope: null,
      totalRegistrations: 0,
      registrationError: "Service worker não suportado",
    };
  }

  try {
    const all = await navigator.serviceWorker.getRegistrations();
    const pushReg = all.find(isPushHandlerRegistration);

    if (pushReg) {
      const scriptUrl =
        pushReg.active?.scriptURL ??
        pushReg.installing?.scriptURL ??
        pushReg.waiting?.scriptURL ??
        null;
      const state =
        pushReg.active?.state ??
        pushReg.installing?.state ??
        pushReg.waiting?.state ??
        "none";

      pushLog(context, "service_worker", "info", "Service worker de push já registado", {
        scriptUrl,
        state,
        scope: pushReg.scope,
      });

      return {
        ...base,
        pushHandlerRegistered: true,
        pushHandlerScriptUrl: scriptUrl,
        pushHandlerState: state,
        pushHandlerScope: pushReg.scope,
        totalRegistrations: all.length,
        registrationError: null,
      };
    }

    pushLog(context, "service_worker", "info", "A registar service worker de push", {
      path: PUSH_HANDLER_SW_PATH,
    });

    const registered = await ensureStaffPushServiceWorker();
    if (!registered) {
      pushLog(context, "service_worker", "error", "Registo do service worker de push falhou");
      return {
        ...base,
        pushHandlerRegistered: false,
        pushHandlerScriptUrl: null,
        pushHandlerState: "none",
        pushHandlerScope: null,
        totalRegistrations: all.length,
        registrationError: "Registo falhou, ver consola do browser",
      };
    }

    const scriptUrl =
      registered.active?.scriptURL ??
      registered.installing?.scriptURL ??
      registered.waiting?.scriptURL ??
      null;
    const state =
      registered.active?.state ??
      registered.installing?.state ??
      registered.waiting?.state ??
      "none";

    pushLog(context, "service_worker", "info", "Service worker de push registado com sucesso", {
      scriptUrl,
      state,
      scope: registered.scope,
    });

    const refreshed = await navigator.serviceWorker.getRegistrations();
    return {
      ...base,
      pushHandlerRegistered: true,
      pushHandlerScriptUrl: scriptUrl,
      pushHandlerState: state,
      pushHandlerScope: registered.scope,
      totalRegistrations: refreshed.length,
      registrationError: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    pushLog(context, "service_worker", "error", "Erro ao verificar service worker de push", {
      error: message,
    });
    return {
      ...base,
      pushHandlerRegistered: false,
      pushHandlerScriptUrl: null,
      pushHandlerState: "none",
      pushHandlerScope: null,
      totalRegistrations: 0,
      registrationError: message,
    };
  }
}

export { PUSH_HANDLER_SW_PATH, ensureStaffPushServiceWorker, isPushHandlerRegistration };
