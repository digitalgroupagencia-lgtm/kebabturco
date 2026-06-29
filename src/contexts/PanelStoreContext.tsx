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
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { fetchActiveStoresForTenant } from "@/lib/fetchActiveStores";
import { isDefaultKebabContextHost, normalizeHostname } from "@/lib/platformHosts";
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
  if (selectedTenantId) return selectedTenantId;
  if (roleTenantId) return roleTenantId;
  if (role === "admin_master") return DEFAULT_TENANT_ID;

  if (typeof window !== "undefined") {
    const host = normalizeHostname(window.location.hostname);
    if (host) {
      const { data: rows } = await supabase
        .from("tenants")
        .select("id, custom_domain, slug")
        .eq("is_active", true);

      const byDomain = (rows ?? []).find(
        (t) => t.custom_domain && normalizeHostname(t.custom_domain) === host,
      );
      if (byDomain?.id) return byDomain.id;

      if (isDefaultKebabContextHost(host)) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", DEFAULT_TENANT_SLUG)
          .maybeSingle();
        if (t?.id) return t.id;
      }
    }
  }

  const { data: t } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .maybeSingle();
  return t?.id ?? null;
}

function resolveStoreId(
  options: PanelStoreOption[],
  tenantId: string,
  lockedStore: string | null | undefined,
  canSwitchStore: boolean,
): string | null {
  if (!options.length) return null;

  const panelSaved =
    typeof window !== "undefined" ? window.localStorage.getItem(panelStorageKey(tenantId)) : null;
  const adminSaved =
    typeof window !== "undefined" ? window.localStorage.getItem(adminStorageKey(tenantId)) : null;

  const pick = (id: string | null | undefined) =>
    id && options.some((s) => s.id === id) ? id : null;

  const fallback = options[0]?.id ?? null;

  if (canSwitchStore) {
    return (
      pick(panelSaved) ??
      pick(adminSaved) ??
      pick(lockedStore) ??
      fallback
    );
  }

  return pick(lockedStore) ?? fallback;
}

export function PanelStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { tenant: selectedTenant, loading: tenantLoading } = useSelectedTenant();
  const [stores, setStores] = useState<PanelStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canSwitchStore = Boolean(
    roleData?.role && MULTI_STORE_ROLES.has(roleData.role as StaffRole),
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
          setLoading(false);
        }
        return;
      }

      const storeRows = await fetchActiveStoresForTenant(tenantId);
      if (!active) return;

      const options: PanelStoreOption[] = storeRows.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
      }));
      setStores(options);

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
      const tenantId = selectedTenant?.id ?? roleData?.tenant_id;
      if (tenantId && typeof window !== "undefined") {
        window.localStorage.setItem(panelStorageKey(tenantId), id);
      }
    },
    [canSwitchStore, selectedTenant?.id, roleData?.tenant_id],
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
