import { supabase } from "@/integrations/supabase/client";
import { buildGeocodeQuery, geocodeAddress } from "@/lib/geocodeAddress";

/** Calcula e grava latitude/longitude do restaurante a partir do endereço. */
export async function geocodeAndUpdateStoreCoords(
  storeId: string,
  opts: { address: string; storeName?: string | null },
): Promise<{ ok: boolean; lat?: number; lng?: number }> {
  const query = buildGeocodeQuery({
    street: opts.address,
    storeName: opts.storeName,
    country: "España",
  });
  if (!query) return { ok: false };

  const point = await geocodeAddress(query);
  if (!point) return { ok: false };

  const { error } = await supabase
    .from("stores")
    .update({
      latitude: point.lat,
      longitude: point.lng,
      geocoded_address: point.label ?? opts.address,
    })
    .eq("id", storeId);

  if (error) return { ok: false };
  return { ok: true, lat: point.lat, lng: point.lng };
}

/** Garante coordenadas se o endereço existir mas lat/lng estiverem vazios. */
export async function ensureStoreCoordsFromAddress(storeId: string): Promise<boolean> {
  const { data } = await supabase
    .from("stores")
    .select("address, name, latitude, longitude")
    .eq("id", storeId)
    .maybeSingle();

  if (!data?.address?.trim()) return false;
  if (data.latitude != null && data.longitude != null) return true;

  const res = await geocodeAndUpdateStoreCoords(storeId, {
    address: data.address,
    storeName: data.name,
  });
  return res.ok;
}
