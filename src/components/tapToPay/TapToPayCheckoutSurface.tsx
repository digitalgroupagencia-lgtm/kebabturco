import { isTapToPayVisualDemoMode } from "@/lib/tapToPayDemo";
import TapToPayDialog, { type TapToPayDialogOrder } from "@/components/tapToPay/TapToPayDialog";
import TapToPayAppleVisualScreen from "@/components/tapToPay/TapToPayAppleVisualScreen";

type Props = {
  open: boolean;
  order: TapToPayDialogOrder | null;
  storeId: string;
  staffPin: string;
  onClose: () => void;
  onSuccess: (order: TapToPayDialogOrder) => void;
  merchantName?: string;
};

export default function TapToPayCheckoutSurface({
  open,
  order,
  storeId,
  staffPin,
  onClose,
  onSuccess,
  merchantName,
}: Props) {
  if (!order) return null;

  if (isTapToPayVisualDemoMode()) {
    return (
      <TapToPayAppleVisualScreen
        open={open}
        merchantName={merchantName}
        amountEuro={Number(order.total)}
        orderNumber={order.order_number}
        onClose={onClose}
      />
    );
  }

  return (
    <TapToPayDialog
      open={open}
      order={order}
      storeId={storeId}
      staffPin={staffPin}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
