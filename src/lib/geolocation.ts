import { Capacitor } from "@capacitor/core";

export type GeoCoords = {
  lat: number;
  lng: number;
  accuracyM?: number;
  headingDeg?: number;
};

async function loadGeolocationPlugin() {
  const { Geolocation } = await import("@capacitor/geolocation");
  return Geolocation;
}

export async function requestLocationPermission(background = false): Promise<boolean> {
  try {
    const Geolocation = await loadGeolocationPlugin();
    const perm = await Geolocation.requestPermissions({
      permissions: background ? ["location", "coarseLocation"] : ["location"],
    });
    const loc = perm.location ?? perm.coarseLocation;
    return loc === "granted" || loc === "limited";
  } catch {
    if (!navigator.geolocation) return false;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    });
  }
}

export async function getCurrentCoords(): Promise<GeoCoords | null> {
  try {
    const Geolocation = await loadGeolocationPlugin();
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy,
      headingDeg: pos.coords.heading ?? undefined,
    };
  } catch {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracyM: p.coords.accuracy,
            headingDeg: p.heading ?? undefined,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    });
  }
}

export function watchCoords(
  onCoords: (coords: GeoCoords) => void,
  onError?: (err: unknown) => void,
): () => void {
  if (Capacitor.isNativePlatform()) {
    let watchId: string | null = null;
    void (async () => {
      try {
        const Geolocation = await loadGeolocationPlugin();
        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
          (pos, err) => {
            if (err || !pos) {
              onError?.(err);
              return;
            }
            onCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: pos.coords.accuracy,
              headingDeg: pos.coords.heading ?? undefined,
            });
          },
        );
      } catch (e) {
        onError?.(e);
      }
    })();
    return () => {
      if (watchId) void loadGeolocationPlugin().then((G) => G.clearWatch({ id: watchId! }));
    };
  }

  if (!navigator.geolocation) return () => undefined;
  const id = navigator.geolocation.watchPosition(
    (p) =>
      onCoords({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracyM: p.coords.accuracy,
        headingDeg: p.heading ?? undefined,
      }),
    (e) => onError?.(e),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

/** Distância Haversine em km entre dois pontos. */
export function distanceKm(a: GeoCoords, b: GeoCoords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
