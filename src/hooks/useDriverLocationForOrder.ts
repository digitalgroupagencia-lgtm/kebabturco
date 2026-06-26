import { useEffect, useState } from "react";
import { fetchDriverLocationForOrder, type DriverLocationSnapshot } from "@/services/driverLocationService";

const POLL_MS = 5000;

export function useDriverLocationForOrder(orderId: string | null | undefined, enabled: boolean) {
  const [location, setLocation] = useState<DriverLocationSnapshot | null>(null);

  useEffect(() => {
    if (!orderId || !enabled) {
      setLocation(null);
      return;
    }

    let active = true;
    const load = async () => {
      const snap = await fetchDriverLocationForOrder(orderId);
      if (active) setLocation(snap);
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [orderId, enabled]);

  return location;
}
