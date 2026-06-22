import { useEffect, useState } from "react";
import TapToPayAwarenessModal from "@/components/tapToPay/TapToPayAwarenessModal";
import { useTapToPayWarmUp } from "@/hooks/useTapToPayWarmUp";
import { hasSeenTapToPayAwareness, isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { isTapToPayPlatform } from "@/lib/stripeTerminalService";

type Props = {
  storeId: string | null | undefined;
};

/** Boots Tap to Pay awareness + warm-up for staff iPhone apps (panel, seller, cashier). */
export default function TapToPayStaffBootstrap({ storeId }: Props) {
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const enabled = isTapToPayPlatform() && !!storeId;

  useTapToPayWarmUp(storeId ?? null, enabled && isTapToPayUserEnabled());

  useEffect(() => {
    if (!enabled || !storeId) return;
    if (!hasSeenTapToPayAwareness()) {
      const timer = window.setTimeout(() => setAwarenessOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
  }, [enabled, storeId]);

  if (!enabled || !storeId) return null;

  return (
    <TapToPayAwarenessModal
      open={awarenessOpen}
      storeId={storeId}
      onOpenChange={setAwarenessOpen}
    />
  );
}
