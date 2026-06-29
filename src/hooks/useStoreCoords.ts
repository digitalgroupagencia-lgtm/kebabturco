import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StoreCoords = { lat: number; lng: number };

export function useStoreCoords(storeId: string | null | undefined): StoreCoords | null {
  const [coords, setCoords] = useState<StoreCoords | null>(null);

  useEffect(() => {
    if (!storeId) {
      setCoords(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("stores")
          .select("latitude, longitude")
          .eq("id", storeId)
          .maybeSingle();
        if (cancelled || !data) return;
        const lat = Number((data as any).latitude);
        const lng = Number((data as any).longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setCoords({ lat, lng });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return coords;
}
