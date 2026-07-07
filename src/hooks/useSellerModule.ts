import { useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/projectAccess";

/**
 * Verifica se o módulo "Vendedor" está activo para o restaurante.
 * Admin geral vê e gere sempre; restaurantes dependem do override/plano.
 */
export function useSellerModuleEnabled(tenantId: string | null | undefined) {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const isPlatformAdmin = isGeneralAdmin(roleData?.role);
  const { data: flags, isLoading } = useTenantFeatureFlags(tenantId);
  const enabled =
    isPlatformAdmin || !!flags?.find((f) => f.feature_key === "seller_app")?.enabled;
  return { enabled, isLoading };
}
