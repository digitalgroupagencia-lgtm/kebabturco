import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MesaFromUrl {
  mesaNumber: string;
  tableId: string;
  locked: boolean;
}

export function useMesaFromUrl(storeId: string | null) {
  const [mesa, setMesa] = useState<MesaFromUrl | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("mesa")?.trim();

    if (!raw || !storeId) {
      setMesa(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tables")
        .select("id, number, is_active")
        .eq("store_id", storeId)
        .eq("number", raw)
        .eq("is_active", true)
        .maybeSingle();

      if (!active) return;
      if (data) {
        setMesa({ mesaNumber: data.number, tableId: data.id, locked: true });
      } else {
        setMesa(null);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [storeId]);

  return { mesa, loading };
}
