import { useCallback, useEffect, useState } from "react";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";
import {
  isNativePushAvailable,
  isNativePushAvailableSync,
  registerNativeCustomerPush,
} from "@/services/nativePush";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(
    () => isNativePushAvailableSync() || Boolean(getVapidPublicKey()),
  );

  useEffect(() => {
    void isNativePushAvailable().then((native) => {
      if (native) setSupported(true);
    });
  }, []);

  const subscribe = useCallback(
    async (opts: { storeId?: string; orderId?: string; customerPhone?: string }) => {
      if (!opts.storeId) {
        setError("Loja inválida");
        return false;
      }

      const customerPhone = opts.customerPhone ?? CUSTOMER_MARKETING_PUSH_TAG;

      if (await isNativePushAvailable()) {
        const native = await registerNativeCustomerPush(opts.storeId, {
          customerPhone,
          orderId: opts.orderId ?? null,
          logContext: "order",
        });
        if (native.ok) {
          setSubscribed(true);
          setError(null);
          return true;
        }
        if (native.reason !== "not-native") {
          setError(native.reason ?? "Erro ao activar push");
          return false;
        }
      }

      const result = await subscribePushWithLogging({
        context: "order",
        storeId: opts.storeId,
        orderId: opts.orderId ?? null,
        customerPhone,
        onOptIn: () => setSubscribed(true),
        userMessageDenied: "Permissão de notificações negada",
        userMessageUnavailable: "Push não disponível neste dispositivo",
      });

      if (!result.ok) {
        setError(result.error ?? "Erro ao activar push");
        return false;
      }

      setError(null);
      return true;
    },
    [],
  );

  return { subscribe, subscribed, error, supported };
}
