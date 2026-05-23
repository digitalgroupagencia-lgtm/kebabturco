import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

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

        const { error: dbErr } = await supabase.from("push_subscriptions").upsert(
          {
            store_id: opts.storeId || null,
            order_id: opts.orderId || null,
            customer_phone: opts.customerPhone || null,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
          { onConflict: "endpoint" },
        );

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
