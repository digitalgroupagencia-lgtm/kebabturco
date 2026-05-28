import { useCallback, useEffect, useState } from "react";
import { resolveStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";

/** Garante loja real na entrada da equipa (ignora fallback de preview). */
export function useStaffLoginStore() {
  const { storeId, selectedStoreId, loading: globalLoading } = useResolvedStore();
  const [storeIdResolved, setStoreIdResolved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const direct = await resolveStaffLoginStoreId();
    if (direct) {
      setStoreIdResolved(direct);
      setLoading(false);
      return direct;
    }

    const fromContext = selectedStoreId ?? storeId;
    if (fromContext && !isEmergencyFallbackStoreId(fromContext)) {
      setStoreIdResolved(fromContext);
      setLoading(false);
      return fromContext;
    }

    setStoreIdResolved(null);
    setLoading(false);
    return null;
  }, [selectedStoreId, storeId]);

  useEffect(() => {
    if (globalLoading) return;
    void refresh();
  }, [globalLoading, refresh]);

  return {
    storeId: storeIdResolved,
    loading: globalLoading || loading,
    refresh,
  };
}
