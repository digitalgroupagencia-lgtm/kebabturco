import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { isGeneralAdmin } from "@/lib/projectAccess";
import { isTenantFeatureEnabled, normalizePlan } from "@/lib/platformFeatureGates";
import type { PlanKey } from "@/lib/platformFeatures";

/**
 * Acesso a funcionalidades por plano/flags do tenant.
 * Admin geral (admin_master) tem tudo desbloqueado.
 */
export function useTenantFeatureAccess(explicitTenantId?: string | null) {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const { tenant } = useSelectedTenant();
  const isPlatformAdmin = isGeneralAdmin(roleData?.role);
  const tenantId = explicitTenantId ?? tenant?.id ?? roleData?.tenant_id ?? "";
  const tenantPlan = normalizePlan(tenant?.plan);
  const { data: flags } = useTenantFeatureFlags(tenantId);

  const isFeatureEnabled = useCallback(
    (featureKey: string, planOverride?: PlanKey) =>
      isTenantFeatureEnabled(featureKey, planOverride ?? tenantPlan, {
        platformAdmin: isPlatformAdmin,
        featureFlags: flags,
      }),
    [isPlatformAdmin, tenantPlan, flags],
  );

  return useMemo(
    () => ({
      isPlatformAdmin,
      tenantId,
      tenantPlan,
      flags,
      isFeatureEnabled,
    }),
    [isPlatformAdmin, tenantId, tenantPlan, flags, isFeatureEnabled],
  );
}
