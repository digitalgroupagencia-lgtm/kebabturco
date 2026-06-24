import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Recarrega repasses quando o webhook Stripe grava em store_payouts. */
export function useStorePayoutsRealtime(storeId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`store-payouts-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_payouts",
          filter: `store_id=eq.${storeId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId, onChange]);
}
