import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useOptionalPanelStore } from "@/contexts/PanelStoreContext";
import { useOptionalAdminStore } from "@/contexts/AdminStoreContext";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";

async function firstActiveStoreForTenant(tenantId: string): Promise<string | null> {
  const db = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await db
    .from("stores_public")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    const legacy = await supabase
      .from("stores")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return legacy.data?.id ?? null;
  }

  return data.id as string;
}

/**
 * Resolve store_id para páginas admin/panel — nunca usa loja global aleatória.
 */
export function useAdminStoreId(): { storeId: string | null; loading: boolean } {
  const { slug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const { tenantId: hostTenantId } = useResolvedStore();
  const { tenant, loading: tenantLoading } = useSelectedTenant();
  const panelStore = useOptionalPanelStore();
  const adminStore = useOptionalAdminStore();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const inPanel = typeof window !== "undefined" && window.location.pathname.startsWith("/panel");
  const inAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if ((inPanel && panelStore) || (inAdmin && adminStore)) return;

    let active = true;
    (async () => {
      setLoading(true);
      let resolved: string | null = null;

      if (slug) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (t?.id) {
          resolved = await firstActiveStoreForTenant(t.id);
        }
      }

      if (!resolved && tenant?.store_id) {
        resolved = tenant.store_id;
      }

      if (!resolved && tenant?.id) {
        resolved = await firstActiveStoreForTenant(tenant.id);
      }

      if (!resolved && user?.id) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("store_id, tenant_id")
          .eq("user_id", user.id);

        const withStore = roles?.find((r) => r.store_id);
        if (withStore?.store_id) {
          resolved = withStore.store_id;
        } else {
          const tenantIds = [...new Set((roles || []).map((r) => r.tenant_id).filter(Boolean))] as string[];
          if (tenantIds.length === 1) {
            resolved = await firstActiveStoreForTenant(tenantIds[0]);
          }
        }
      }

      if (!resolved && hostTenantId) {
        resolved = await firstActiveStoreForTenant(hostTenantId);
      }

      if (!resolved) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", DEFAULT_TENANT_SLUG)
          .maybeSingle();
        if (t?.id) {
          resolved = await firstActiveStoreForTenant(t.id);
        }
      }

      if (active) {
        setStoreId(resolved);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    slug,
    user?.id,
    hostTenantId,
    tenant?.id,
    tenant?.store_id,
    tenantLoading,
    inPanel,
    panelStore?.storeId,
    panelStore?.loading,
    inAdmin,
    adminStore?.storeId,
    adminStore?.loading,
  ]);

  if (inPanel && panelStore) {
    return { storeId: panelStore.storeId, loading: panelStore.loading };
  }

  if (inAdmin && adminStore) {
    return { storeId: adminStore.storeId, loading: adminStore.loading };
  }

  return { storeId, loading: loading || tenantLoading };
}
