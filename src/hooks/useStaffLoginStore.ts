import { useCallback, useEffect, useState } from "react";
import { resolveStaffLoginStoreId, persistStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";

/** Loja real na entrada da equipa, resolve logo ao abrir, sem bloquear no fallback global. */
export function useStaffLoginStore() {
  const { storeId, selectedStoreId } = useResolvedStore();
  const [storeIdResolved, setStoreIdResolved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async () => {
    setRetrying(true);
    const direct = await resolveStaffLoginStoreId();
    if (direct) {
      setStoreIdResolved(direct);
      persistStaffLoginStoreId(direct);
      setLoading(false);
      setRetrying(false);
      return direct;
    }

    const fromContext = selectedStoreId ?? storeId;
    if (fromContext && !isEmergencyFallbackStoreId(fromContext)) {
      setStoreIdResolved(fromContext);
      persistStaffLoginStoreId(fromContext);
      setLoading(false);
      setRetrying(false);
      return fromContext;
    }

    setStoreIdResolved(null);
    setLoading(false);
    setRetrying(false);
    return null;
  }, [selectedStoreId, storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    storeId: storeIdResolved,
    loading,
    retrying,
    refresh,
  };
}
