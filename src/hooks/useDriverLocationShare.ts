import { useEffect, useRef } from "react";
import { watchCoords, requestLocationPermission } from "@/lib/geolocation";
import { publishDriverLocation } from "@/services/driverLocationService";

/** Partilha GPS do motoboy enquanto activo (app aberta ou em segundo plano no telemóvel). */
export function useDriverLocationShare(opts: {
  storeId: string | null | undefined;
  activeOrderId: string | null;
  enabled: boolean;
}) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!opts.enabled || !opts.storeId) return;

    let stopWatch: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const ok = await requestLocationPermission(true);
      if (!ok || cancelled) return;

      stopWatch = watchCoords((coords) => {
        const now = Date.now();
        if (now - lastSent.current < 8000) return;
        lastSent.current = now;
        void publishDriverLocation({
          storeId: opts.storeId!,
          activeOrderId: opts.activeOrderId,
          coords,
        }).catch(() => undefined);
      });
    })();

    return () => {
      cancelled = true;
      stopWatch?.();
    };
  }, [opts.enabled, opts.storeId, opts.activeOrderId]);
}
