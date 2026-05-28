import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type AppLang, normalizeActiveLangs } from "@/lib/localizedText";

export function useStoreLanguages(storeId: string | null | undefined) {
  const [primaryLang, setPrimaryLang] = useState<AppLang>("es");
  const [activeLangs, setActiveLangs] = useState<AppLang[]>(["es"]);
  const [loading, setLoading] = useState(Boolean(storeId));

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("totem_config")
        .select("primary_language, active_languages")
        .eq("store_id", storeId)
        .maybeSingle();
      if (!alive) return;
      const { primary, actives } = normalizeActiveLangs(
        data?.primary_language,
        (data?.active_languages as string[] | null) ?? null,
      );
      setPrimaryLang(primary);
      setActiveLangs(actives);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [storeId]);

  return { primaryLang, activeLangs, loading };
}
