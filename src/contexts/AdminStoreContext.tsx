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
import { isGeneralAdmin } from "@/lib/projectAccess";
import {
  fetchStoresForStaffContext,
  pickStaffStoreId,
  resolveStaffTenantId,
} from "@/lib/staffStoreResolution";

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

function panelStorageKey(tenantId: string) {
  return `kebab-panel-store:${tenantId}`;
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { tenant: selectedTenant, loading: tenantLoading } = useSelectedTenant();
  const [stores, setStores] = useState<AdminStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminMaster = isGeneralAdmin(roleData?.role);

  useEffect(() => {
    let active = true;

    (async () => {
      if (roleLoading || tenantLoading) return;
      setLoading(true);

      const tenantId = await resolveStaffTenantId(
        selectedTenant?.id,
        roleData?.tenant_id ?? null,
        isAdminMaster,
      );

      if (!tenantId) {
        if (active) {
          setStores([]);
          setSelectedStoreId(null);
          setResolvedTenantId(null);
          setLoading(false);
        }
        return;
      }

      const storeRows = await fetchStoresForStaffContext(tenantId, isAdminMaster);
      const options: AdminStoreOption[] = storeRows.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
      }));

      const resolved = pickStaffStoreId(
        options,
        tenantId,
        roleData?.store_id,
        panelStorageKey,
        storageKey,
      );

      if (active) {
        setStores(options);
        setResolvedTenantId(tenantId);
        setSelectedStoreId(resolved);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [roleLoading, tenantLoading, selectedTenant?.id, roleData?.tenant_id, roleData?.store_id, isAdminMaster]);

  const canSwitchStore = isAdminMaster || stores.length > 1;

  const setStoreId = useCallback(
    (id: string) => {
      setSelectedStoreId(id);
      const tenantId = resolvedTenantId ?? selectedTenant?.id ?? roleData?.tenant_id;
      if (tenantId && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(tenantId), id);
      }
    },
    [resolvedTenantId, selectedTenant?.id, roleData?.tenant_id],
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
