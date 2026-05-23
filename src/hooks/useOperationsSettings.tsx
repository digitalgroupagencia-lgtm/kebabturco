import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useResolvedStore } from "@/hooks/useResolvedStore";

export type OperationsSettings = Tables<"operations_settings">;

const Ctx = createContext<{ settings: OperationsSettings | null; loading: boolean; refresh: () => Promise<void> } | undefined>(undefined);

export const OperationsSettingsProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({ children, storeId: storeIdProp }) => {
  const resolved = useResolvedStore();
  const storeId = storeIdProp ?? resolved.storeId ?? "";
  const [settings, setSettings] = useState<OperationsSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase.from("operations_settings").select("*").eq("store_id", storeId).maybeSingle();
    setSettings(data ?? null);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    load();
    const ch = supabase
      .channel(`ops:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "operations_settings", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId, load]);

  return <Ctx.Provider value={{ settings, loading, refresh: load }}>{children}</Ctx.Provider>;
};

export const useOperationsSettings = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOperationsSettings must be used within OperationsSettingsProvider");
  return c;
};