import { useCallback, useState } from "react";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(
    async (opts: { storeId?: string; orderId?: string; customerPhone?: string }) => {
      if (!opts.storeId) {
        setError("Loja inválida");
        return false;
      }

      const result = await subscribePushWithLogging({
        context: "order",
        storeId: opts.storeId,
        orderId: opts.orderId ?? null,
        customerPhone: opts.customerPhone ?? null,
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

  return { subscribe, subscribed, error, supported: Boolean(getVapidPublicKey()) };
}
