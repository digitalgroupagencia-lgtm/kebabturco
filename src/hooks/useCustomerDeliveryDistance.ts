import { useEffect } from "react";
import type { StoreCoords } from "@/hooks/useStoreCoords";

type Params = {
  enabled: boolean;
  storeCoords: StoreCoords | null;
  street: string;
  number: string;
  postal: string;
  city: string;
  onDistanceKm: (km: number | null) => void;
};

/** Stub: hook reservado para geocodificação futura de endereços. */
export function useCustomerDeliveryDistance(_params: Params): void {
  useEffect(() => {
    /* no-op por agora */
  }, []);
}
