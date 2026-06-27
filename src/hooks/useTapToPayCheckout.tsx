import { useCallback, useState } from "react";
import TapToPayCheckoutSurface from "@/components/tapToPay/TapToPayCheckoutSurface";
import { useStaffPinConfirm } from "@/hooks/useStaffPinConfirm";
import { waitForStaffPinUiDismiss } from "@/lib/prepareTapToPayCheckout";
import { getTapToPayUnavailableMessage } from "@/lib/stripeTerminalService";
import { isTapToPayUiAvailable, isTapToPayVisualDemoMode } from "@/lib/tapToPayDemo";
import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { toast } from "sonner";
import { useStaffT } from "@/hooks/useStaffT";

export type TapToPayOrder = {
  id: string;
  order_number: string | number;
  total: number | string;
  customer_email?: string | null;
};

type Options = {
  storeId: string;
  onSuccess?: (order: TapToPayOrder) => void;
};

export function useTapToPayCheckout({ storeId, onSuccess }: Options) {
  const { t } = useStaffT();
  const { requestStaffPin, StaffPinDialog } = useStaffPinConfirm();
  const [tapPayOrder, setTapPayOrder] = useState<TapToPayOrder | null>(null);
  const [tapPayPin, setTapPayPin] = useState("");

  const requestTapToPay = useCallback(
    async (order: TapToPayOrder) => {
      if (!isTapToPayUiAvailable()) {
        toast.error(getTapToPayUnavailableMessage());
        return false;
      }
      if (!isTapToPayVisualDemoMode() && !isTapToPayUserEnabled()) {
        toast.error(t("tapToPay.checkout.enable_first"));
        return false;
      }
      const pin = await requestStaffPin({
        amountLabel: `#${order.order_number} · €${Number(order.total).toFixed(2)}`,
        title: t("tapToPay.title"),
        description: t("tapToPay.pin_desc"),
      });
      if (!pin) return false;

      await waitForStaffPinUiDismiss();

      setTapPayPin(pin);
      setTapPayOrder(order);
      return true;
    },
    [requestStaffPin, storeId, t],
  );

  const TapToPayCheckoutDialog = useCallback(
    () => (
      <>
        <StaffPinDialog />
        <TapToPayCheckoutSurface
          open={!!tapPayOrder}
          order={tapPayOrder}
          storeId={storeId}
          staffPin={tapPayPin}
          onClose={() => {
            setTapPayOrder(null);
            setTapPayPin("");
          }}
          onSuccess={(order) => {
            onSuccess?.({
              id: order.id,
              order_number: order.order_number,
              total: order.total,
              customer_email: (order as { customer_email?: string | null }).customer_email,
            });
            setTapPayOrder(null);
            setTapPayPin("");
          }}
        />
      </>
    ),
    [StaffPinDialog, onSuccess, storeId, tapPayOrder, tapPayPin],
  );

  return {
    requestTapToPay,
    requestStaffPin,
    TapToPayCheckoutDialog,
    isTapToPayAvailable: isTapToPayUiAvailable(),
  };
}
