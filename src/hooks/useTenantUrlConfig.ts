import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { APP_NAME, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { type TenantUrlConfig } from "@/lib/tenantUrls";

type TenantRow = {
  slug: string;
  name: string;
  custom_domain: string | null;
  path_slug: string | null;
  master_domain: string | null;
  use_master_domain: boolean;
};

export function useTenantUrlConfig() {
  const { tenantId, tenantSlug, loading: storeLoading } = useResolvedStore();
  const { tenant: selectedTenant } = useSelectedTenant();
  const [row, setRow] = useState<TenantRow | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (selectedTenant?.slug) {
      setRow({
        slug: selectedTenant.slug,
        name: selectedTenant.name,
        custom_domain: selectedTenant.custom_domain,
        path_slug: selectedTenant.path_slug,
        master_domain: selectedTenant.master_domain,
        use_master_domain: selectedTenant.use_master_domain,
      });
      return;
    }

    let cancelled = false;
    const load = async () => {
      setFetching(true);
      try {
        let data: TenantRow | null = null;
        if (tenantId) {
          const r = await supabase
            .from("tenants")
            .select("slug, name, custom_domain, path_slug, master_domain, use_master_domain")
            .eq("id", tenantId)
            .maybeSingle();
          data = r.data as TenantRow | null;
        }
        if (!data && tenantSlug) {
          const r = await supabase
            .from("tenants")
            .select("slug, name, custom_domain, path_slug, master_domain, use_master_domain")
            .eq("slug", tenantSlug)
            .maybeSingle();
          data = r.data as TenantRow | null;
        }
        if (!cancelled) setRow(data);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, tenantSlug, selectedTenant?.slug, selectedTenant?.name]);

  const tenantConfig = useMemo((): TenantUrlConfig => {
    if (row) {
      return {
        slug: row.slug,
        custom_domain: row.custom_domain,
        path_slug: row.path_slug,
        master_domain: row.master_domain,
        use_master_domain: row.use_master_domain,
      };
    }
    return { slug: tenantSlug || DEFAULT_TENANT_SLUG };
  }, [row, tenantSlug]);

  return {
    tenant: tenantConfig,
    restaurantName: row?.name || selectedTenant?.name || APP_NAME,
    loading: storeLoading || fetching,
  };
}
