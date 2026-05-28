import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";

const VAPID_PUBLIC = getVapidPublicKey();

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(
    async (opts: { storeId?: string; orderId?: string; customerPhone?: string }) => {
      if (!VAPID_PUBLIC || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Push não disponível neste dispositivo");
        return false;
      }

      if (!opts.storeId) {
        setError("Loja inválida");
        return false;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("Permissão de notificações negada");
          return false;
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
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

        const { error: dbErr } = await supabase.rpc("register_push_subscription", {
          _store_id: opts.storeId!,
          _order_id: opts.orderId ?? null,
          _customer_phone: opts.customerPhone ?? null,
          _endpoint: json.endpoint,
          _p256dh: json.keys.p256dh,
          _auth: json.keys.auth,
        });

        if (dbErr) throw dbErr;
        setSubscribed(true);
        setError(null);
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    [],
  );

  return { subscribe, subscribed, error, supported: Boolean(VAPID_PUBLIC) };
}
