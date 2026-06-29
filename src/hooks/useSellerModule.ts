import { useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";

/**
 * Verifica se o módulo "Vendedor" está activo para o restaurante.
 * Por defeito está DESACTIVADO, apenas o admin master da plataforma pode ligar
 * (override em `tenant_feature_overrides` para `seller_app`).
 */
export function useSellerModuleEnabled(tenantId: string | null | undefined) {
  const { data: flags, isLoading } = useTenantFeatureFlags(tenantId);
  const enabled = !!flags?.find((f) => f.feature_key === "seller_app")?.enabled;
  return { enabled, isLoading };
}
