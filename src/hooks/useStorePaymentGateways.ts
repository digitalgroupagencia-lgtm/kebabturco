import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreGatewayRow = {
  gateway_code: "stripe" | "redsys" | "bizum";
  status: "disabled" | "sandbox" | "production";
};

/** Devolve os gateways ATIVOS (sandbox ou production) de uma loja. */
export function useStoreActiveGateways(storeId: string | null | undefined) {
  return useQuery<StoreGatewayRow[]>({
    queryKey: ["store-active-gateways", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_payment_gateways")
        .select("gateway_code, status")
        .eq("store_id", storeId!)
        .neq("status", "disabled");
      if (error) throw error;
      return (data as StoreGatewayRow[]) ?? [];
    },
  });
}
