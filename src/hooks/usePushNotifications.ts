import { useCallback, useEffect, useState } from "react";
import { getVapidPublicKey } from "@/lib/vapidPublicKey";
import { subscribePushWithLogging } from "@/lib/push/pushSubscriptionCore";
import {
  isNativePushAvailable,
  isNativePushAvailableSync,
  registerNativeCustomerPush,
} from "@/services/nativePush";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { sendImmediateWelcomePushIfNeeded } from "@/lib/customerWelcomePush";

function isTechnicalPushError(message: string | undefined): boolean {
  if (!message) return false;
  return /plugin is not implemented|not implemented on web|native-bridge-unavailable/i.test(message);
}

/** Mantém alertas da equipa no mesmo telemóvel sem import estático (regra do fluxo cliente). */
async function restoreStaffPushIfEnabledSafe(storeId: string): Promise<void> {
  try {
    const { restoreStaffPushIfEnabled } = await import("@/lib/staffPush");
    await restoreStaffPushIfEnabled(storeId);
  } catch (e) {
    console.warn("[push] re-registo equipa após pedido cliente ignorado:", e);
  }
}

/** Subscrição push opcional — falhas nunca devem bloquear checkout ou pagamento. */
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
    async (opts: {
      storeId?: string;
      orderId?: string;
      customerPhone?: string;
      customerName?: string;
      storeName?: string;
    }) => {
      if (!opts.storeId) return false;

      const customerPhone = opts.customerPhone ?? CUSTOMER_MARKETING_PUSH_TAG;

      try {
        if (await isNativePushAvailable()) {
          const native = await registerNativeCustomerPush(opts.storeId, {
            customerPhone,
            orderId: opts.orderId ?? null,
            logContext: "order",
          });
        if (native.ok) {
          setSubscribed(true);
          setError(null);
          await restoreStaffPushIfEnabledSafe(opts.storeId);
          void sendImmediateWelcomePushIfNeeded(
            opts.storeId,
            customerPhone,
            opts.customerName,
            opts.storeName,
          );
          return true;
        }
          if (native.reason !== "not-native" && !isTechnicalPushError(native.reason)) {
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
          if (!isTechnicalPushError(result.error)) {
            setError(result.error ?? "Erro ao activar push");
          }
          return false;
        }

        setError(null);
        await restoreStaffPushIfEnabledSafe(opts.storeId);
        void sendImmediateWelcomePushIfNeeded(
          opts.storeId,
          customerPhone,
          opts.customerName,
          opts.storeName,
        );
        return true;
      } catch (e) {
        console.warn("[push] subscribe opcional falhou:", e);
        return false;
      }
    },
    [],
  );

  return { subscribe, subscribed, error, supported };
}
