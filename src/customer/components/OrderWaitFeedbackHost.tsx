import { useEffect, useState } from "react";
import OrderWaitFeedbackDialog from "@/customer/components/OrderWaitFeedbackDialog";
import { shouldShowWaitFeedback } from "@/lib/waitFeedbackStorage";

type Props = {
  orderId: string | null | undefined;
  orderStatus: string | null | undefined;
  orderNumber?: string;
  delayMs?: number;
};

export default function OrderWaitFeedbackHost({
  orderId,
  orderStatus,
  orderNumber,
  delayMs = 4000,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!orderId || !orderStatus) return;
    if (orderStatus === "cancelled" || orderStatus === "delivered") return;
    if (!shouldShowWaitFeedback(orderId)) return;

    const timer = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [orderId, orderStatus, delayMs]);

  if (!orderId || !orderStatus) return null;
  if (orderStatus === "cancelled" || orderStatus === "delivered") return null;

  return (
    <OrderWaitFeedbackDialog
      open={open}
      orderId={orderId}
      orderNumber={orderNumber}
      onClose={() => setOpen(false)}
    />
  );
}
