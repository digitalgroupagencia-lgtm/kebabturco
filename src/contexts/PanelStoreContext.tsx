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

function storageKey(tenantId: string) {
  return `kebab-panel-store:${tenantId}`;
}

export function PanelStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const [stores, setStores] = useState<PanelStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canSwitchStore = Boolean(
    roleData?.role && MULTI_STORE_ROLES.has(roleData.role as StaffRole),
  );

  useEffect(() => {
    let active = true;

    (async () => {
      if (roleLoading) return;

      if (!roleData?.tenant_id && !roleData?.store_id) {
        if (active) {
          setStores([]);
          setSelectedStoreId(roleData?.store_id ?? null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      let tenantId = roleData.tenant_id;
      if (!tenantId && roleData.store_id) {
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
          setSelectedStoreId(roleData.store_id);
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

      const options = (storeRows ?? []) as PanelStoreOption[];
      setStores(options);

      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(storageKey(tenantId))
          : null;

      const lockedStore = roleData.store_id;
      const fallback = options[0]?.id ?? null;
      let resolved: string | null;

      if (canSwitchStore) {
        resolved =
          (saved && options.some((s) => s.id === saved) ? saved : null) ??
          (lockedStore && options.some((s) => s.id === lockedStore) ? lockedStore : null) ??
          fallback;
      } else {
        resolved =
          lockedStore && options.some((s) => s.id === lockedStore)
            ? lockedStore
            : fallback;
      }

      setSelectedStoreId(resolved);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [roleLoading, roleData?.tenant_id, roleData?.store_id, roleData?.role, canSwitchStore]);

  const setStoreId = useCallback(
    (id: string) => {
      if (!canSwitchStore) return;
      setSelectedStoreId(id);
      const tenantId = roleData?.tenant_id;
      if (tenantId && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(tenantId), id);
      }
    },
    [canSwitchStore, roleData?.tenant_id],
  );

  const value = useMemo<PanelStoreCtx>(
    () => ({
      storeId: selectedStoreId,
      stores,
      canSwitchStore,
      setStoreId,
      loading: roleLoading || loading,
    }),
    [selectedStoreId, stores, canSwitchStore, setStoreId, roleLoading, loading],
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

/** Usado dentro do painel — respeita a unidade seleccionada pelo dono/gerente. */
export function usePanelStoreId(): { storeId: string | null; loading: boolean } {
  const ctx = useContext(PanelStoreContext);
  if (!ctx) {
    return { storeId: null, loading: true };
  }
  return { storeId: ctx.storeId, loading: ctx.loading };
}
