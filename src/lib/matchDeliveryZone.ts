export interface DeliveryZoneLike {
  id?: string;
  name: string;
  min_order: number;
  delivery_fee: number;
  is_default: boolean;
  is_active?: boolean;
  postal_codes: string[] | null;
  city_names: string[] | null;
  min_distance_km: number | null;
  max_distance_km: number | null;
  sort_order: number;
}

export const normCity = (value: string) =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normPostal = (value: string) => value.trim();

export function zoneHasDistanceBand(zone: DeliveryZoneLike): boolean {
  return zone.max_distance_km != null && Number.isFinite(Number(zone.max_distance_km));
}

function activeZones(zones: DeliveryZoneLike[]): DeliveryZoneLike[] {
  return zones.filter((z) => z.is_active !== false);
}

function pickBestMatch(candidates: DeliveryZoneLike[]): DeliveryZoneLike | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? 1 : -1;
    return a.sort_order - b.sort_order;
  })[0];
}

/**
 * Resolve delivery zone (priority):
 * 1. postal_codes (non-default zones first)
 * 2. city_names (non-default zones first)
 * 3. distance bands, only when max_distance_km is set on the zone
 * 4. is_default fallback
 */
export function matchDeliveryZone(
  zones: DeliveryZoneLike[],
  customerPostal: string,
  customerCity: string,
  distanceKm: number | null = null,
): DeliveryZoneLike | null {
  const pool = activeZones(zones);
  const postal = normPostal(customerPostal);
  const city = normCity(customerCity);

  if (postal) {
    const match = pickBestMatch(
      pool.filter((z) => (z.postal_codes || []).some((code) => normPostal(code) === postal)),
    );
    if (match) return match;
  }

  if (city) {
    const match = pickBestMatch(
      pool.filter((z) => (z.city_names || []).some((name) => normCity(name) === city)),
    );
    if (match) return match;
  }

  if (distanceKm != null) {
    const candidates = pool
      .filter(zoneHasDistanceBand)
      .sort((a, b) => Number(a.max_distance_km) - Number(b.max_distance_km));
    const match = candidates.find((z) => {
      const min = Number(z.min_distance_km ?? 0);
      const max = Number(z.max_distance_km ?? 0);
      return distanceKm >= min && distanceKm <= max;
    });
    if (match) return match;
  }

  return pool.find((z) => z.is_default) || null;
}
