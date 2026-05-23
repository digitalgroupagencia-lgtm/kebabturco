import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { matchDeliveryZone } from "@/lib/matchDeliveryZone";

export interface DeliveryZone {
  id: string;
  name: string;
  min_order: number;
  delivery_fee: number;
  is_default: boolean;
  is_active: boolean;
  postal_codes: string[] | null;
  city_names: string[] | null;
  min_distance_km: number | null;
  max_distance_km: number | null;
  sort_order: number;
}

interface DeliveryQuote {
  zone: DeliveryZone | null;
  fee: number;
  minOrder: number;
  belowMinimum: boolean;
  zoneMatched: boolean;
  distanceKm: number | null;
}

/**
 * Taxa de entrega: código postal → cidade → faixa km (só se configurada) → zona padrão.
 */
export function useDeliveryFee(
  storeId: string | null | undefined,
  customerPostal: string,
  customerCity: string,
  subtotal: number,
  distanceKm: number | null = null,
) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setZones([]);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order");
      if (!active) return;
      setZones((data as DeliveryZone[]) || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  const quote: DeliveryQuote = useMemo(() => {
    const matched = matchDeliveryZone(zones, customerPostal, customerCity, distanceKm) as DeliveryZone | null;
    const fee = matched ? Number(matched.delivery_fee || 0) : 0;
    const minOrder = matched ? Number(matched.min_order || 0) : 0;
    return {
      zone: matched,
      fee,
      minOrder,
      belowMinimum: minOrder > 0 && subtotal < minOrder,
      zoneMatched: Boolean(matched),
      distanceKm,
    };
  }, [zones, customerPostal, customerCity, subtotal, distanceKm]);

  return { quote, zones, loading };
}
