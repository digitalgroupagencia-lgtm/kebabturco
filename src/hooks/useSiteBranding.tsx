import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  applySiteBrandingToDocument,
  brandingFromCompany,
  brandingFromPlatform,
  shouldApplyPlatformSiteBranding,
  shouldApplyTenantSiteBranding,
  SNAPORDER_NEUTRAL_BRANDING,
  type SiteBranding,
} from "@/lib/siteBranding";
import { isEmbeddedTenantPreview, PREVIEW_MESSAGE_TYPE } from "@/lib/tenantPreview";
import type { Tables } from "@/integrations/supabase/types";

type CompanySettings = Tables<"company_settings">;

/**
 * Aplica branding do documento por domínio:
 * - SnapOrder no admin/auth da plataforma
 * - Tenant no domínio do restaurante (ou prévia embebida ?tenant=&preview=1)
 */
export function SiteBrandingEffect() {
  const { storeId, loading: storeLoading } = useResolvedStore();
  const usePlatform = shouldApplyPlatformSiteBranding();
  const useTenant = shouldApplyTenantSiteBranding();

  const platformQuery = useQuery({
    queryKey: ["site-branding-platform"],
    enabled: usePlatform,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const tenantQuery = useQuery({
    queryKey: ["site-branding-tenant", storeId],
    enabled: useTenant && !!storeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .eq("store_id", storeId!)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!usePlatform || platformQuery.isLoading) return;
    applySiteBrandingToDocument(brandingFromPlatform(platformQuery.data));
  }, [usePlatform, platformQuery.data, platformQuery.isLoading]);

  useEffect(() => {
    if (!useTenant || storeLoading || tenantQuery.isLoading) return;
    if (!storeId) {
      if (isEmbeddedTenantPreview()) {
        applySiteBrandingToDocument({ ...SNAPORDER_NEUTRAL_BRANDING, scope: "neutral" });
      }
      return;
    }
    applySiteBrandingToDocument(brandingFromCompany(tenantQuery.data));
  }, [useTenant, storeId, storeLoading, tenantQuery.data, tenantQuery.isLoading]);

  useEffect(() => {
    if (!isEmbeddedTenantPreview()) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== PREVIEW_MESSAGE_TYPE) return;
      const draft = event.data.payload as Partial<CompanySettings> | null;
      const base = tenantQuery.data ? { ...tenantQuery.data, ...draft } : draft;
      if (base) applySiteBrandingToDocument(brandingFromCompany(base as CompanySettings));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [tenantQuery.data]);

  return null;
}

export function mergeDraftSiteBranding(
  saved: SiteBranding,
  draft: Partial<CompanySettings> | null | undefined,
): SiteBranding {
  if (!draft) return saved;
  return brandingFromCompany({ ...draft } as CompanySettings);
}
