/** Geocodificação de moradas via OpenStreetMap (Nominatim) — sem chave API. */

export type GeocodedPoint = { lat: number; lng: number; label?: string };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "KebabTurco/1.0 (https://kebabturco.net; delivery-fee)";

let lastRequestAt = 0;

async function throttleNominatim(): Promise<void> {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/** Monta texto de pesquisa para o restaurante ou morada de entrega. */
export function buildGeocodeQuery(parts: {
  street?: string | null;
  number?: string | null;
  postal?: string | null;
  city?: string | null;
  storeName?: string | null;
  country?: string | null;
}): string | null {
  const line = [parts.street?.trim(), parts.number?.trim()].filter(Boolean).join(" ");
  const locality = [parts.postal?.trim(), parts.city?.trim()].filter(Boolean).join(" ");
  if (!line && !locality) return null;
  const chunks = [line, locality, parts.storeName?.trim(), parts.country?.trim() || "España"].filter(
    (x) => x && x.length > 0,
  );
  const q = chunks.join(", ");
  return q.length >= 6 ? q : null;
}

/** Converte morada em coordenadas (latitude/longitude). */
export async function geocodeAddress(query: string): Promise<GeocodedPoint | null> {
  const q = query.trim();
  if (q.length < 6) return null;

  await throttleNominatim();

  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    countrycodes: "es",
  })}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const hit = rows?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: hit.display_name };
  } catch {
    return null;
  }
}
