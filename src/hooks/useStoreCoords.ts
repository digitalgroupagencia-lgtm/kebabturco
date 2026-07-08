import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStoreCoords(storeId: string | null | undefined) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!storeId) {
      setCoords(null);
      return;
    }
    let active = true;
    void (async () => {
      const { data } = await (supabase as any)
        .from("stores_public")
        .select("latitude, longitude")
        .eq("id", storeId)
        .maybeSingle();
      if (!active || !data?.latitude || !data?.longitude) {
        if (active) setCoords(null);
        return;
      }
      setCoords({ lat: Number(data.latitude), lng: Number(data.longitude) });
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  return coords;
}
