import { useEffect, useState } from "react";
import {
  countUrgentPendingOrders,
  PANEL_URGENT_CHANGED_EVENT,
  PANEL_UNACK_CHANGED_EVENT,
} from "@/lib/panelAlerts";

/** Ecrã vermelho pulsante quando pedido leva +5 min sem aceitar. */
const PanelUrgentAlertOverlay = () => {
  const [urgentCount, setUrgentCount] = useState(countUrgentPendingOrders);

  useEffect(() => {
    const sync = () => setUrgentCount(countUrgentPendingOrders());
    window.addEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
    window.addEventListener(PANEL_URGENT_CHANGED_EVENT, sync);
    const tick = window.setInterval(sync, 15_000);
    return () => {
      window.removeEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
      window.removeEventListener(PANEL_URGENT_CHANGED_EVENT, sync);
      window.clearInterval(tick);
    };
  }, []);

  if (urgentCount <= 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] animate-pulse bg-red-600/25 ring-4 ring-inset ring-red-500/60"
      aria-hidden
    />
  );
};

export default PanelUrgentAlertOverlay;
