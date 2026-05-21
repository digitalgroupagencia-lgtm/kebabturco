import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const norm = (v: string) =>
  v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Calcula a taxa de entrega da loja baseada em (em ordem de prioridade):
 *  1. Distância em km até a loja (zona com min_distance_km..max_distance_km)
 *  2. CEP do cliente em postal_codes
 *  3. Cidade do cliente em city_names
 *  4. Zona is_default
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
      setZones((data as any) || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  const quote: DeliveryQuote = useMemo(() => {
    const postal = customerPostal.trim();
    const city = norm(customerCity);

    let matched: DeliveryZone | null = null;

    // 1. Match por distância (km)
    if (distanceKm != null) {
      const candidates = zones
        .filter((z) => z.max_distance_km != null)
        .sort(
          (a, b) => (a.max_distance_km ?? 0) - (b.max_distance_km ?? 0),
        );
      matched =
        candidates.find((z) => {
          const min = Number(z.min_distance_km ?? 0);
          const max = Number(z.max_distance_km ?? 0);
          return distanceKm >= min && distanceKm <= max;
        }) || null;
    }

    if (!matched && postal) {
      matched =
        zones.find((z) =>
          (z.postal_codes || []).some((c) => c.trim() === postal),
        ) || null;
    }
    if (!matched && city) {
      matched =
        zones.find((z) =>
          (z.city_names || []).some((c) => norm(c) === city),
        ) || null;
    }
    if (!matched) {
      matched = zones.find((z) => z.is_default) || null;
    }

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
