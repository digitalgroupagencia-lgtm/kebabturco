import { useEffect, useRef } from "react";
import { buildGeocodeQuery, geocodeAddress } from "@/lib/geocodeAddress";
import { distanceKm, type GeoCoords } from "@/lib/geolocation";

/** Calcula distância cliente→restaurante a partir da morada escrita (mesma lógica que o botão GPS). */
export function useCustomerDeliveryDistance(opts: {
  enabled: boolean;
  storeCoords: GeoCoords | null;
  street: string;
  number: string;
  postal: string;
  city: string;
  onDistanceKm: (km: number | null) => void;
}) {
  const seq = useRef(0);

  useEffect(() => {
    if (!opts.enabled || !opts.storeCoords) return;

    const query = buildGeocodeQuery({
      street: opts.street,
      number: opts.number,
      postal: opts.postal,
      city: opts.city,
    });
    if (!query) return;

    const runId = ++seq.current;
    const timer = setTimeout(() => {
      void (async () => {
        const point = await geocodeAddress(query);
        if (runId !== seq.current) return;
        if (!point || !opts.storeCoords) {
          opts.onDistanceKm(null);
          return;
        }
        opts.onDistanceKm(distanceKm(opts.storeCoords, point));
      })();
    }, 900);

    return () => clearTimeout(timer);
  }, [
    opts.enabled,
    opts.storeCoords,
    opts.street,
    opts.number,
    opts.postal,
    opts.city,
    opts.onDistanceKm,
  ]);
}
