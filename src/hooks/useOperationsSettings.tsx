import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OperationsSettings = Tables<"operations_settings">;

const Ctx = createContext<{ settings: OperationsSettings | null; loading: boolean; refresh: () => Promise<void> } | undefined>(undefined);

const DEFAULT_STORE_ID = "b0000000-0000-0000-0000-000000000001";

export const OperationsSettingsProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({ children, storeId = DEFAULT_STORE_ID }) => {
  const [settings, setSettings] = useState<OperationsSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("operations_settings").select("*").eq("store_id", storeId).maybeSingle();
    setSettings(data ?? null);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
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

import * as React from "react";