export type Coords = { lat: number; lng: number };

/** Distância em km entre duas coordenadas (Haversine). */
export function distanceKm(a: Coords | null | undefined, b: Coords | null | undefined): number {
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
