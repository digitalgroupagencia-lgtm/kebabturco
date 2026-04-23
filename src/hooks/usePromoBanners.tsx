import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PromoBanner = Tables<"promo_banners">;

const DEFAULT_STORE_ID = "b0000000-0000-0000-0000-000000000001";

export const usePromoBanners = (storeId: string = DEFAULT_STORE_ID) => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
    load();
    const ch = supabase
      .channel(`promo:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_banners", filter: `store_id=eq.${storeId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId, load]);

  return { banners, loading, refresh: load };
};