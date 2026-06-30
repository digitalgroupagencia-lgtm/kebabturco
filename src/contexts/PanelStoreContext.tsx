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
import type { StaffRole } from "@/lib/staffPermissions";

export type PanelStoreOption = {
  id: string;
  name: string;
  address: string | null;
};

type PanelStoreCtx = {
  storeId: string | null;
  stores: PanelStoreOption[];
  canSwitchStore: boolean;
  setStoreId: (id: string) => void;
  loading: boolean;
};

const PanelStoreContext = createContext<PanelStoreCtx | null>(null);

const MULTI_STORE_ROLES = new Set<StaffRole>([
  "admin_master",
  "restaurant_admin",
  "manager",
]);

function panelStorageKey(tenantId: string) {
  return `kebab-panel-store:${tenantId}`;
}

function adminStorageKey(tenantId: string) {
  return `kebab-admin-store:${tenantId}`;
}

async function resolveTenantIdForPanel(
  selectedTenantId: string | null | undefined,
  roleTenantId: string | null | undefined,
  role: StaffRole | undefined,
): Promise<string | null> {
  return resolveStaffTenantId(
    selectedTenantId,
    roleTenantId,
    isGeneralAdmin(role),
  );
}

function resolveStoreId(
  options: PanelStoreOption[],
  tenantId: string,
  lockedStore: string | null | undefined,
  _canSwitchStore: boolean,
): string | null {
  return pickStaffStoreId(options, tenantId, lockedStore, panelStorageKey, adminStorageKey);
}

export function PanelStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { tenant: selectedTenant, loading: tenantLoading } = useSelectedTenant();
  const [stores, setStores] = useState<PanelStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canSwitchStore = Boolean(
    (roleData?.role && MULTI_STORE_ROLES.has(roleData.role as StaffRole)) ||
      isGeneralAdmin(roleData?.role),
  );

  useEffect(() => {
    let active = true;

    (async () => {
      if (roleLoading || tenantLoading) return;

      setLoading(true);

      let tenantId = await resolveTenantIdForPanel(
        selectedTenant?.id,
        roleData?.tenant_id ?? null,
        roleData?.role as StaffRole | undefined,
      );

      if (!tenantId && roleData?.store_id) {
        const { data: storeRow } = await supabase
          .from("stores")
          .select("tenant_id")
          .eq("id", roleData.store_id)
          .maybeSingle();
        tenantId = storeRow?.tenant_id ?? null;
      }

      if (!tenantId) {
        if (active) {
          setStores([]);
          setSelectedStoreId(roleData?.store_id ?? null);
          setResolvedTenantId(null);
          setLoading(false);
        }
        return;
      }

      const storeRows = await fetchStoresForStaffContext(
        tenantId,
        isGeneralAdmin(roleData?.role as StaffRole | undefined),
      );
      if (!active) return;

      const options: PanelStoreOption[] = storeRows.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
      }));
      setStores(options);
      setResolvedTenantId(tenantId);

      const resolved = resolveStoreId(
        options,
        tenantId,
        roleData?.store_id,
        canSwitchStore,
      );

      setSelectedStoreId(resolved);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [
    roleLoading,
    tenantLoading,
    selectedTenant?.id,
    roleData?.tenant_id,
    roleData?.store_id,
    roleData?.role,
    canSwitchStore,
  ]);

  const setStoreId = useCallback(
    (id: string) => {
      if (!canSwitchStore) return;
      setSelectedStoreId(id);
      const tenantId = resolvedTenantId ?? selectedTenant?.id ?? roleData?.tenant_id;
      if (tenantId && typeof window !== "undefined") {
        window.localStorage.setItem(panelStorageKey(tenantId), id);
      }
    },
    [canSwitchStore, resolvedTenantId, selectedTenant?.id, roleData?.tenant_id],
  );

  const value = useMemo<PanelStoreCtx>(
    () => ({
      storeId: selectedStoreId,
      stores,
      canSwitchStore,
      setStoreId,
      loading: roleLoading || tenantLoading || loading,
    }),
    [selectedStoreId, stores, canSwitchStore, setStoreId, roleLoading, tenantLoading, loading],
  );

  return <PanelStoreContext.Provider value={value}>{children}</PanelStoreContext.Provider>;
}

export function useOptionalPanelStore(): PanelStoreCtx | null {
  return useContext(PanelStoreContext);
}

export function usePanelStore() {
  const ctx = useContext(PanelStoreContext);
  if (!ctx) {
    throw new Error("usePanelStore must be used within PanelStoreProvider");
  }
  return ctx;
}

/** Usado dentro do painel, respeita a unidade seleccionada pelo dono/gerente. */
export function usePanelStoreId(): { storeId: string | null; loading: boolean } {
  const ctx = useContext(PanelStoreContext);
  if (!ctx) {
    return { storeId: null, loading: true };
  }
  return { storeId: ctx.storeId, loading: ctx.loading };
}
