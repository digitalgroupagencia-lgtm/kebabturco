import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GatewayCode = "stripe" | "redsys" | "bizum";
export type GatewayStatus = "disabled" | "sandbox" | "production";

export type StoreGatewayRow = {
  gateway_code: GatewayCode;
  status: GatewayStatus;
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

/**
 * Devolve um mapa { redsys: visible, bizum: visible } para o checkout do cliente.
 * Por padrão Redsys e Bizum aparecem como métodos disponíveis (em fase de
 * implementação). O admin pode ocultá-los marcando status = "disabled" no
 * painel /panel/payments, quando a linha for `disabled`, deixa de aparecer.
 */
export function useCheckoutExtraGatewayVisibility(storeId: string | null | undefined) {
  return useQuery<{ redsys: boolean; bizum: boolean }>({
    queryKey: ["checkout-extra-gateway-visibility", storeId],
    enabled: !!storeId,
    initialData: { redsys: true, bizum: true },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_payment_gateways")
        .select("gateway_code, status")
        .eq("store_id", storeId!)
        .in("gateway_code", ["redsys", "bizum"]);
      if (error) throw error;
      const rows = (data as StoreGatewayRow[]) ?? [];
      const get = (code: GatewayCode) => {
        const row = rows.find((r) => r.gateway_code === code);
        // Sem linha = ainda não configurado → mostra como "em implementação".
        // Linha disabled = admin escondeu.
        return !row || row.status !== "disabled";
      };
      return { redsys: get("redsys"), bizum: get("bizum") };
    },
  });
}
