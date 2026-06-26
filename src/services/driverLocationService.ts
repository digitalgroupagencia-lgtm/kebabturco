import { supabase } from "@/integrations/supabase/client";
import type { GeoCoords } from "@/lib/geolocation";

export async function publishDriverLocation(opts: {
  storeId: string;
  activeOrderId: string | null;
  coords: GeoCoords;
}) {
  const { error } = await supabase.rpc("upsert_driver_location", {
    _store_id: opts.storeId,
    _active_order_id: opts.activeOrderId,
    _lat: opts.coords.lat,
    _lng: opts.coords.lng,
    _accuracy_m: opts.coords.accuracyM ?? null,
    _heading_deg: opts.coords.headingDeg ?? null,
  });
  if (error) throw error;
}

export type DriverLocationSnapshot = {
  lat: number;
  lng: number;
  updated_at: string;
  accuracy_m?: number;
};

export async function fetchDriverLocationForOrder(
  orderId: string,
): Promise<DriverLocationSnapshot | null> {
  const { data, error } = await supabase.rpc("get_driver_location_for_order", { _order_id: orderId });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.lat == null || row.lng == null) return null;
  return {
    lat: Number(row.lat),
    lng: Number(row.lng),
    updated_at: String(row.updated_at ?? ""),
    accuracy_m: row.accuracy_m != null ? Number(row.accuracy_m) : undefined,
  };
}
