import { createContext, useContext, useMemo, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["selected-tenant", slug ?? "user", user?.id ?? "anon"],
    enabled: !!slug || !!user?.id,
    queryFn: async () => {
      let tenantId: string | null = null;

      if (slug) {
        const { data: t } = await supabase
          .from("tenants").select("id").eq("slug", slug).maybeSingle();
        tenantId = t?.id ?? null;
      }

      // Fallback: resolve via logged-in user's role
      if (!tenantId && user?.id) {
        const { data: role } = await supabase
          .from("user_roles").select("tenant_id").eq("user_id", user.id)
          .not("tenant_id", "is", null).limit(1).maybeSingle();
        tenantId = role?.tenant_id ?? null;
      }

      // Final fallback: first active tenant (single-tenant mode)
      if (!tenantId) {
        const { data: t0 } = await supabase
          .from("tenants").select("id").eq("is_active", true).order("created_at").limit(1).maybeSingle();
        tenantId = t0?.id ?? null;
      }

      if (!tenantId) return null;

      const { data: t } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, is_active, custom_domain, max_orders_month")
        .eq("id", tenantId).maybeSingle();
      if (!t) return null;

      const { data: s } = await supabase
        .from("stores").select("id").eq("tenant_id", t.id)
        .order("created_at").limit(1).maybeSingle();
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
