import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SelectedTenant {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  is_active: boolean;
  custom_domain: string | null;
  max_orders_month: number | null;
  store_id: string | null;
}

interface Ctx {
  tenant: SelectedTenant | null;
  loading: boolean;
  error: string | null;
}

const SelectedTenantContext = createContext<Ctx>({ tenant: null, loading: true, error: null });

export function SelectedTenantProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["selected-tenant", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: t, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, is_active, custom_domain, max_orders_month")
        .eq("slug", slug!)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!t) return null;
      const { data: s } = await supabase
        .from("stores")
        .select("id")
        .eq("tenant_id", t.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      return { ...t, store_id: s?.id ?? null } as SelectedTenant;
    },
  });

  const value = useMemo<Ctx>(() => ({
    tenant: data ?? null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }), [data, isLoading, error]);

  return <SelectedTenantContext.Provider value={value}>{children}</SelectedTenantContext.Provider>;
}

export function useSelectedTenant() {
  return useContext(SelectedTenantContext);
}