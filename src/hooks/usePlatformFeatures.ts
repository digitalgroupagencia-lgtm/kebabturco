import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TenantFeatureFlag } from "@/lib/platformFeatures";

export function usePlatformPlans() {
  return useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("id, plan_key, name, description, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantFeatureFlags(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenant-feature-flags", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_feature_flags", {
        _tenant_id: tenantId!,
      });
      if (error) throw error;
      return (data ?? []) as TenantFeatureFlag[];
    },
  });
}

export function useSetTenantPlan() {
  const qc = useQueryClient();
  return async (tenantId: string, planKey: string, isBeta = false) => {
    const { error } = await supabase.rpc("set_tenant_plan", {
      _tenant_id: tenantId,
      _plan_key: planKey,
      _is_beta: isBeta,
    });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["tenant-feature-flags", tenantId] });
    await qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    await qc.invalidateQueries({ queryKey: ["admin-centrals-tenants"] });
  };
}

export function useSetFeatureOverride() {
  const qc = useQueryClient();
  return async (tenantId: string, featureKey: string, enabled: boolean) => {
    const { error } = await supabase.rpc("set_tenant_feature_override", {
      _tenant_id: tenantId,
      _feature_key: featureKey,
      _enabled: enabled,
      _notes: null,
    });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["tenant-feature-flags", tenantId] });
  };
}

export function useAdminCentralsTenants() {
  return useQuery({
    queryKey: ["admin-centrals-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, name, slug, plan, is_active,
          tenant_plan_assignments ( is_beta, plan_id )
        `)
        .eq("is_template", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenantAiModules(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenant-ai-modules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_ai_modules")
        .select("id, module_key, is_enabled, status")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function upsertTenantAiModule(
  tenantId: string,
  moduleKey: string,
  isEnabled: boolean,
) {
  const { error } = await supabase.from("tenant_ai_modules").upsert(
    {
      tenant_id: tenantId,
      module_key: moduleKey,
      is_enabled: isEnabled,
      status: isEnabled ? "prepared" : "disabled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,module_key" },
  );
  if (error) throw error;
}

export function useTenantLoyaltyProgram(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenant-loyalty-program", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_loyalty_programs")
        .select("id, model_type, is_active, config")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTenantMarketingSettings(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenant-marketing-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_marketing_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function upsertTenantMarketingSettings(
  tenantId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase.from("tenant_marketing_settings").upsert(
    { tenant_id: tenantId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id" },
  );
  if (error) throw error;
}
