import { useCallback, useState } from "react";
import TapToPayCheckoutSurface from "@/components/tapToPay/TapToPayCheckoutSurface";
import TapToPayAppleVisualScreen from "@/components/tapToPay/TapToPayAppleVisualScreen";
import { useStaffPinConfirm } from "@/hooks/useStaffPinConfirm";
import { waitForStaffPinUiDismiss } from "@/lib/prepareTapToPayCheckout";
import { isTapToPayUiAvailable, isTapToPayVisualDemoMode } from "@/lib/tapToPayDemo";
import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { getTapToPayUnavailableMessage } from "@/lib/stripeTerminalService";
import { markOrderPaidAtCounter } from "@/services/orderService";
import { markSellerOrderPaidCard } from "@/services/sellerPaymentService";
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
};

export function useSellerPayment({ storeId, onSuccess }: Options) {
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const { requestStaffPin, StaffPinDialog } = useStaffPinConfirm();
  const [cardOrder, setCardOrder] = useState<SellerPaymentOrder | null>(null);
  const [terminalOrder, setTerminalOrder] = useState<SellerPaymentOrder | null>(null);
  const [terminalPin, setTerminalPin] = useState("");
  const [cardBusy, setCardBusy] = useState(false);

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

  const confirmVisualCard = useCallback(async () => {
    if (!cardOrder) return;
    setCardBusy(true);
    try {
      await markSellerOrderPaidCard(cardOrder.id);
      toast.success(t("tapToPay.step.success"));
      setCardOrder(null);
      onSuccess?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("tapToPay.step.error"));
    } finally {
      setCardBusy(false);
    }
  }, [cardOrder, onSuccess, t]);

  const SellerPaymentDialogs = useCallback(
    () => (
      <>
        <StaffPinDialog />
        {isTapToPayVisualDemoMode() ? (
          <TapToPayAppleVisualScreen
            open={!!cardOrder}
            amountEuro={Number(cardOrder?.total ?? 0)}
            orderNumber={cardOrder?.order_number}
            onClose={() => setCardOrder(null)}
            showConfirmButton
            confirmBusy={cardBusy}
            onConfirm={() => void confirmVisualCard()}
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
    [StaffPinDialog, cardBusy, cardOrder, confirmVisualCard, onSuccess, storeId, terminalOrder, terminalPin],
  );

  return {
    payCash,
    payCard,
    SellerPaymentDialogs,
    canPayCard: isTapToPayUiAvailable(),
  };
}
