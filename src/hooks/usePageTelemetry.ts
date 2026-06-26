import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackVisit } from "@/lib/usageTelemetry";
import { trackMarketingEvent } from "@/lib/marketingAnalytics";

/** Regista cada navegação em telemetria local (para o Assistente IA). */
export function usePageTelemetry() {
  const location = useLocation();
  useEffect(() => {
    trackVisit(location.pathname);
    if (location.pathname === "/" || location.pathname.startsWith("/menu")) {
      void trackMarketingEvent("menu_view");
    }
  }, [location.pathname]);
}
