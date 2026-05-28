import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";

export type AdminStoreOption = {
  id: string;
  name: string;
  address: string | null;
};

type AdminStoreCtx = {
  storeId: string | null;
  stores: AdminStoreOption[];
  canSwitchStore: boolean;
  setStoreId: (id: string) => void;
  loading: boolean;
};

const AdminStoreContext = createContext<AdminStoreCtx | null>(null);

function storageKey(tenantId: string) {
  return `kebab-admin-store:${tenantId}`;
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { tenant: selectedTenant, loading: tenantLoading } = useSelectedTenant();
  const [stores, setStores] = useState<AdminStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      if (roleLoading || tenantLoading) return;
      setLoading(true);

      let tenantId = selectedTenant?.id ?? roleData?.tenant_id ?? null;
      if (!tenantId) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", DEFAULT_TENANT_SLUG)
          .maybeSingle();
        tenantId = t?.id ?? null;
      }

      if (!tenantId) {
        if (active) {
          setStores([]);
          setSelectedStoreId(null);
          setLoading(false);
        }
        return;
      }

      const { data: storeRows } = await supabase
        .from("stores")
        .select("id, name, address")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");

      if (!active) return;

      const options = (storeRows ?? []) as AdminStoreOption[];
      setStores(options);

      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(storageKey(tenantId))
          : null;

      const fallback = options[0]?.id ?? null;
      const resolved =
        (saved && options.some((s) => s.id === saved) ? saved : null) ?? fallback;

      setSelectedStoreId(resolved);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [roleLoading, tenantLoading, selectedTenant?.id, roleData?.tenant_id]);

  const canSwitchStore = stores.length > 1;

  const setStoreId = useCallback(
    (id: string) => {
      setSelectedStoreId(id);
      const tenantId = selectedTenant?.id ?? roleData?.tenant_id;
      if (tenantId && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(tenantId), id);
      }
    },
    [selectedTenant?.id, roleData?.tenant_id],
  );

  const value = useMemo<AdminStoreCtx>(
    () => ({
      storeId: selectedStoreId,
      stores,
      canSwitchStore,
      setStoreId,
      loading: roleLoading || tenantLoading || loading,
    }),
    [selectedStoreId, stores, canSwitchStore, setStoreId, roleLoading, tenantLoading, loading],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useOptionalAdminStore() {
  return useContext(AdminStoreContext);
}

export function useAdminStorePicker() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) {
    throw new Error("useAdminStorePicker must be used within AdminStoreProvider");
  }
  return ctx;
}
