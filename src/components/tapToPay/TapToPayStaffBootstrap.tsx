import { useEffect, useState } from "react";
import TapToPayAwarenessModal from "@/components/tapToPay/TapToPayAwarenessModal";
import { hasSeenTapToPayAwareness, isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { isPanelAlertsEnabled } from "@/lib/panelAlerts";
import { isTapToPayPlatform } from "@/lib/stripeTerminalService";

type Props = {
  storeId: string | null | undefined;
};

/** Apresenta activação Tap to Pay só depois dos alertas de pedidos — evita empilhar modais com a Apple. */
export default function TapToPayStaffBootstrap({ storeId }: Props) {
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const enabled = isTapToPayPlatform() && !!storeId;

  useEffect(() => {
    if (!enabled || !storeId) return;
    if (hasSeenTapToPayAwareness() || isTapToPayUserEnabled()) return;

    let cancelled = false;
    const tryOpen = () => {
      if (cancelled) return;
      if (isPanelAlertsEnabled()) {
        setAwarenessOpen(true);
        return;
      }
      window.setTimeout(tryOpen, 400);
    };
    const timer = window.setTimeout(tryOpen, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
