import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Result {
  distanceKm: number | null;
  formattedAddress: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Faz geocoding do endereço do cliente (street + number + postal + city)
 * via edge function `geocode-address` e devolve a distância até a loja.
 * Debounce de 800ms para não chamar a API em cada tecla.
 */
export function useCustomerGeocode(
  storeId: string | null | undefined,
  street: string,
  number: string,
  postal: string,
  city: string,
  enabled: boolean,
): Result {
  const [state, setState] = useState<Result>({
    distanceKm: null,
    formattedAddress: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !storeId) {
      setState({ distanceKm: null, formattedAddress: null, loading: false, error: null });
      return;
    }
    const full = [street, number, postal, city, "España"]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(", ");
    if (full.length < 8 || !street.trim() || (!postal.trim() && !city.trim())) {
      setState((p) => ({ ...p, distanceKm: null, formattedAddress: null, error: null }));
      return;
    }
    let cancelled = false;
    setState((p) => ({ ...p, loading: true, error: null }));
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("geocode-address", {
          body: { storeId, address: full, mode: "customer" },
        });
        if (cancelled) return;
        if (error || !data) {
          setState({ distanceKm: null, formattedAddress: null, loading: false, error: error?.message || "Erro" });
          return;
        }
        setState({
          distanceKm: typeof data.distance_km === "number" ? data.distance_km : null,
          formattedAddress: data.formatted_address ?? null,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({ distanceKm: null, formattedAddress: null, loading: false, error: (e as Error).message });
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [storeId, street, number, postal, city, enabled]);

  return state;
}
