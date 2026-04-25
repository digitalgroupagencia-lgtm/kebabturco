import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useResolvedStore } from "@/hooks/useResolvedStore";

export type PromoBanner = Tables<"promo_banners">;

export const usePromoBanners = (storeIdArg?: string) => {
  const resolved = useResolvedStore();
  const storeId = storeIdArg ?? resolved.storeId ?? "";
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("promo_banners")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setBanners(data ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    load();
    const ch = supabase
      .channel(`promo:${storeId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_banners", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId, load]);

  return { banners, loading, refresh: load };
};