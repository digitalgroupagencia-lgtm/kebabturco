import { useEffect, useMemo, useState } from "react";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import {
  evaluateSchedule,
  parseSchedule,
  STORE_DEFAULTS,
  DELIVERY_STORE_DEFAULTS,
  type OpenStatus,
} from "@/lib/storeHours";

export type StoreChannel = "store" | "delivery";

const FORCE_OPEN_KEY = "__forceStoreOpen";

/**
 * Override de teste — permite forçar a loja como ABERTA durante validação:
 *   - URL: ?forceOpen=1  (grava em localStorage e persiste na sessão)
 *   - URL: ?forceOpen=0  (remove o override)
 *   - localStorage["__forceStoreOpen"] = "1"
 * Não afeta produção a menos que algum operador active manualmente.
 */
function readForceOpenFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const qp = params.get("forceOpen");
    if (qp === "1" || qp === "true") {
      window.localStorage.setItem(FORCE_OPEN_KEY, "1");
      return true;
    }
    if (qp === "0" || qp === "false") {
      window.localStorage.removeItem(FORCE_OPEN_KEY);
      return false;
    }
    return window.localStorage.getItem(FORCE_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Estado de abertura por canal — re-avalia a cada 30s.
 * Cliente nunca é bloqueado de navegar — usa-se só no checkout.
 */
export function useStoreOpenStatus(channel: StoreChannel = "store"): OpenStatus {
  const { settings } = useOperationsSettings();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (readForceOpenFlag()) {
      return { open: true, nextOpenLabel: null, nextOpenDayLabel: null, currentRange: null };
    }
    // Bypass administrativo: quando "Aplicar horário de funcionamento" está desactivado,
    // a loja é considerada sempre aberta (útil para testes e homologação).
    const applySchedule = (settings as any)?.apply_schedule_enabled;
    if (applySchedule === false) {
      return { open: true, nextOpenLabel: null, nextOpenDayLabel: null, currentRange: null };
    }
    const tz = (settings as any)?.schedule_timezone || "Europe/Madrid";
    const raw =
      channel === "delivery"
        ? (settings as any)?.delivery_schedule
        : (settings as any)?.weekly_schedule;
    const fallback = channel === "delivery" ? DELIVERY_STORE_DEFAULTS : STORE_DEFAULTS;
    const schedule = parseSchedule(raw, fallback);
    return evaluateSchedule(schedule, tz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, channel, tick]);
}
