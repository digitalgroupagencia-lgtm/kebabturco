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
  sort_order: number;
}

interface DeliveryQuote {
  zone: DeliveryZone | null;
  fee: number;
  minOrder: number;
  belowMinimum: boolean;
  zoneMatched: boolean;
}

const norm = (v: string) =>
  v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Carrega as zonas de entrega da loja e calcula a taxa baseada
 * no CEP e/ou cidade do cliente.
 *  - Match 1: CEP/postal_code está em postal_codes da zona
 *  - Match 2: cidade do cliente está em city_names da zona
 *  - Fallback: zona marcada como is_default
 */
export function useDeliveryFee(
  storeId: string | null | undefined,
  customerPostal: string,
  customerCity: string,
  subtotal: number,
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

    if (postal) {
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
    };
  }, [zones, customerPostal, customerCity, subtotal]);

  return { quote, zones, loading };
}
