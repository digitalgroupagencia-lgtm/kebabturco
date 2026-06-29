import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackVisit } from "@/lib/usageTelemetry";

/** Regista cada navegação em telemetria local (para o Assistente IA). */
export function usePageTelemetry() {
  const location = useLocation();
  useEffect(() => {
    trackVisit(location.pathname);
  }, [location.pathname]);
}
