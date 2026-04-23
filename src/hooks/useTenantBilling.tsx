import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantBilling {
  monthly_base: number;
  sellers_included: number;
  sellers_allowed: number;
  sellers_active: number;
  extra_sellers: number;
  extra_seller_price: number;
  extra_total: number;
  monthly_total: number;
  setup_fee: number;
  currency: string;
  next_due_date: string | null;
  status: string;
}

export function useTenantBilling(tenantId: string | undefined | null) {
  return useQuery({
    queryKey: ["tenant-billing", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantBilling | null> => {
      if (!tenantId) return null;
      const { data, error } = await supabase.rpc("get_tenant_billing", { _tenant_id: tenantId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as TenantBilling) ?? null;
    },
  });
}

export function fmtMoney(value: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
      style: "currency",
      currency,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}
