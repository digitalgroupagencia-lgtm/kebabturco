import { supabase } from "@/integrations/supabase/client";
import { getDeviceLocaleTag } from "@/lib/deviceLocale";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { urlBase64ToUint8Array } from "@/lib/vapidPublicKey";
import { probePushServiceWorker, getBrowserPushSupport } from "@/lib/push/pushServiceWorkerProbe";
import { getVapidKeyDiagnostics } from "@/lib/push/pushVapidDiagnostics";
import {
  describePushFailure,
  pushLog,
  type PushLogContext,
} from "@/lib/push/pushLogger";

export type PushSubscribeResult = {
  ok: boolean;
  error?: string;
  errorCode?: string;
};

export type PushSubscribeOptions = {
  context: PushLogContext;
  storeId: string;
  orderId?: string | null;
  customerPhone?: string | null;
  onOptIn?: () => void;
  userMessageDenied?: string;
  userMessageUnavailable?: string;
};

export async function subscribePushWithLogging(
  opts: PushSubscribeOptions,
): Promise<PushSubscribeResult> {
  const {
    context,
    storeId,
    orderId = null,
    customerPhone = null,
    onOptIn,
    userMessageDenied = "Permissão de notificações negada",
    userMessageUnavailable = "Push não disponível neste dispositivo",
  } = opts;

  pushLog(context, "init", "info", "Início da subscrição push", { storeId, orderId, customerPhone });

  const vapidDiag = getVapidKeyDiagnostics();
  const vapidKey = getVapidPublicKey();

  pushLog(context, "vapid_check", vapidDiag.loaded ? "info" : "error", vapidDiag.loaded
    ? `Chave VAPID carregada (${vapidDiag.source})`
    : "Chave VAPID não encontrada", {
    ...vapidDiag,
  });

  if (!vapidKey || !vapidDiag.loaded) {
    return { ok: false, error: userMessageUnavailable, errorCode: "vapid_missing" };
  }

  if (!vapidDiag.validFormat || !vapidDiag.decodable) {
    pushLog(context, "vapid_check", "error", "Formato da chave VAPID inválido", vapidDiag);
    return {
      ok: false,
      error: "Chave VAPID inválida, verifique VITE_VAPID_PUBLIC_KEY",
      errorCode: "vapid_invalid_format",
    };
  }

  const browser = getBrowserPushSupport();
  pushLog(context, "browser_support", browser.supported ? "info" : "error", "Capacidades do browser", browser);

  if (!browser.supported || !browser.pushManagerSupported || !browser.notificationSupported) {
    return { ok: false, error: userMessageUnavailable, errorCode: "browser_unsupported" };
  }

  if (!browser.secureContext) {
    pushLog(context, "browser_support", "error", "Contexto inseguro, push requer HTTPS", browser);
    return { ok: false, error: "Push requer ligação segura (HTTPS)", errorCode: "insecure_context" };
  }

  if (!storeId) {
    pushLog(context, "init", "error", "storeId em falta");
    return { ok: false, error: "Loja inválida", errorCode: "invalid_store" };
  }

  try {
    const swDiag = await probePushServiceWorker(context);
    if (!swDiag.pushHandlerRegistered) {
      return {
        ok: false,
        error: swDiag.registrationError ?? "Service worker de push não registado",
        errorCode: "service_worker_failed",
      };
    }

    const permissionBefore = Notification.permission;
    pushLog(context, "permission", "info", "A pedir permissão de notificações", {
      permissionBefore,
    });

    const permission = await Notification.requestPermission();
    pushLog(context, "permission", permission === "granted" ? "info" : "warn", `Permissão: ${permission}`, {
      permissionBefore,
      permissionAfter: permission,
    });

    if (permission !== "granted") {
      return { ok: false, error: userMessageDenied, errorCode: "permission_denied" };
    }

    const reg = await navigator.serviceWorker.ready;
    const existingSub = await reg.pushManager.getSubscription();

    if (existingSub) {
      const endpoint = existingSub.endpoint;
      pushLog(context, "subscribe", "info", "Subscrição antiga encontrada, removendo antes de recriar", {
        endpointPreview: endpoint.slice(0, 48) + "…",
      });
      await existingSub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }

    pushLog(context, "subscribe", "info", "A criar nova subscrição push", {
      vapidSource: vapidDiag.source,
    });

    let sub: PushSubscription;
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });
    } catch (subscribeErr) {
      const described = describePushFailure(subscribeErr, permission);
      pushLog(context, "subscribe", "error", described.message, described.details);
      return { ok: false, error: described.message, errorCode: described.code };
    }

    pushLog(context, "subscribe", "info", "Subscrição push criada", {
      endpointPreview: sub.endpoint.slice(0, 48) + "…",
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      pushLog(context, "subscription_parse", "error", "Subscrição push incompleta", { json });
      return { ok: false, error: "Subscrição push inválida", errorCode: "invalid_subscription" };
    }

    pushLog(context, "subscription_parse", "info", "Chaves da subscrição validadas", {
      endpointHost: (() => {
        try {
          return new URL(json.endpoint).host;
        } catch {
          return "unknown";
        }
      })(),
    });

    const { error: dbErr } = await supabase.rpc("register_push_subscription", {
      _store_id: storeId,
      _order_id: orderId ?? undefined,
      _customer_phone: customerPhone ?? undefined,
      _endpoint: json.endpoint,
      _p256dh: json.keys.p256dh,
      _auth: json.keys.auth,
      _device_locale: getDeviceLocaleTag(),
    });

    if (dbErr) {
      pushLog(context, "db_register", "error", "Falha ao guardar subscrição na base de dados", {
        code: dbErr.code,
        message: dbErr.message,
        details: dbErr.details,
        hint: dbErr.hint,
      });
      throw dbErr;
    }

    pushLog(context, "db_register", "info", "Subscrição guardada na base de dados");
    onOptIn?.();

    return { ok: true };
  } catch (e) {
    const described = describePushFailure(e);
    pushLog(context, "subscribe", "error", described.message, described.details);
    return { ok: false, error: described.message, errorCode: described.code };
  }
}
