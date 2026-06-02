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
