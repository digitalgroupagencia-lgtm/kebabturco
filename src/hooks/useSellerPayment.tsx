import { useCallback, useState } from "react";
import TapToPayCheckoutSurface from "@/components/tapToPay/TapToPayCheckoutSurface";
import TapToPayAppleVisualScreen from "@/components/tapToPay/TapToPayAppleVisualScreen";
import { useStaffPinConfirm } from "@/hooks/useStaffPinConfirm";
import { waitForStaffPinUiDismiss } from "@/lib/prepareTapToPayCheckout";
import { isTapToPayUiAvailable, isTapToPayVisualDemoMode } from "@/lib/tapToPayDemo";
import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { getTapToPayUnavailableMessage } from "@/lib/stripeTerminalService";
import { markOrderPaidAtCounter } from "@/services/orderService";
import { explainStaffPinPaymentError } from "@/lib/staffAccessPin";
import { toast } from "sonner";
import { useStaffT } from "@/hooks/useStaffT";

export type SellerPaymentOrder = {
  id: string;
  order_number: string | number;
  total: number | string;
  customer_email?: string | null;
};

type Options = {
  storeId: string;
  onSuccess?: () => void;
  onDemoDismissed?: (order: SellerPaymentOrder) => void;
};

export function useSellerPayment({ storeId, onSuccess, onDemoDismissed }: Options) {
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const { requestStaffPin, StaffPinDialog } = useStaffPinConfirm();
  const [cardOrder, setCardOrder] = useState<SellerPaymentOrder | null>(null);
  const [terminalOrder, setTerminalOrder] = useState<SellerPaymentOrder | null>(null);
  const [terminalPin, setTerminalPin] = useState("");

  const payCash = useCallback(
    async (order: SellerPaymentOrder) => {
      const pin = await requestStaffPin({
        amountLabel: `#${order.order_number} · €${Number(order.total).toFixed(2)}`,
        description: t("seller.pay.cash_desc"),
      });
      if (!pin) return false;
      try {
        await markOrderPaidAtCounter(order.id, "cash", pin);
        toast.success(t("tapToPay.step.success"));
        onSuccess?.();
        return true;
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : String(e);
        toast.error(explainStaffPinPaymentError(raw, uiLang));
        return false;
      }
    },
    [onSuccess, requestStaffPin, t, uiLang],
  );

  const payCard = useCallback(
    async (order: SellerPaymentOrder) => {
      if (!isTapToPayUiAvailable()) {
        toast.error(getTapToPayUnavailableMessage());
        return false;
      }
      if (isTapToPayVisualDemoMode()) {
        setCardOrder(order);
        return true;
      }
      if (!isTapToPayUserEnabled()) {
        toast.error(t("tapToPay.checkout.enable_first"));
        return false;
      }
      const pin = await requestStaffPin({
        amountLabel: `#${order.order_number} · €${Number(order.total).toFixed(2)}`,
        title: t("seller.pay.card_title"),
        description: t("tapToPay.pin_desc"),
      });
      if (!pin) return false;
      await waitForStaffPinUiDismiss();
      setTerminalPin(pin);
      setTerminalOrder(order);
      return true;
    },
    [requestStaffPin, t],
  );

  const SellerPaymentDialogs = useCallback(
    () => (
      <>
        <StaffPinDialog />
        {isTapToPayVisualDemoMode() ? (
          <TapToPayAppleVisualScreen
            open={!!cardOrder}
            amountEuro={Number(cardOrder?.total ?? 0)}
            orderNumber={cardOrder?.order_number}
            onClose={() => {
              const order = cardOrder;
              setCardOrder(null);
              if (order) onDemoDismissed?.(order);
            }}
          />
        ) : (
          <TapToPayCheckoutSurface
            open={!!terminalOrder}
            order={terminalOrder}
            storeId={storeId}
            staffPin={terminalPin}
            onClose={() => {
              setTerminalOrder(null);
              setTerminalPin("");
            }}
            onSuccess={() => {
              onSuccess?.();
              setTerminalOrder(null);
              setTerminalPin("");
            }}
          />
        )}
      </>
    ),
    [StaffPinDialog, cardOrder, onDemoDismissed, onSuccess, storeId, terminalOrder, terminalPin],
  );

  return {
    payCash,
    payCard,
    SellerPaymentDialogs,
    canPayCard: isTapToPayUiAvailable(),
  };
}
