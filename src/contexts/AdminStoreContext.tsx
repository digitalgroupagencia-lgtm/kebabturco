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
import { fetchActiveStoresForTenant } from "@/lib/fetchActiveStores";
import { isLovableEditorHost, normalizeHostname } from "@/lib/platformHosts";

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
  return `propio-admin-store:${tenantId}`;
}

async function resolveTenantIdForAdmin(
  selectedTenantId: string | null | undefined,
  roleTenantId: string | null | undefined,
): Promise<string | null> {
  if (selectedTenantId) return selectedTenantId;
  if (roleTenantId) return roleTenantId;

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

      // Editor Lovable (preview do Master): cai para tenant template.
      // Em domínio real desconhecido NÃO há fallback — admin trata.
      if (isLovableEditorHost(host)) {
        const { data: t } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", DEFAULT_TENANT_SLUG)
          .maybeSingle();
        if (t?.id) return t.id;
      }
    }
  }

  // Último recurso global: tenant template (usado pelo Master só em ambientes
  // sem domínio resolvido). Em produção real, `roleData.tenant_id` resolve.
  if (typeof window !== "undefined" && isLovableEditorHost(window.location.hostname)) {
    const { data: t } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", DEFAULT_TENANT_SLUG)
      .maybeSingle();
    return t?.id ?? null;
  }
  return null;
}

async function resolveInitialStoreId(
  options: AdminStoreOption[],
  tenantId: string,
): Promise<string | null> {
  if (!options.length) return null;

  const saved =
    typeof window !== "undefined" ? window.localStorage.getItem(storageKey(tenantId)) : null;

  const counts = await Promise.all(
    options.map(async (store) => {
      const { count, error } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id);
      return { id: store.id, count: error ? 0 : count ?? 0 };
    }),
  );

  if (saved && options.some((s) => s.id === saved)) {
    const savedCount = counts.find((c) => c.id === saved)?.count ?? 0;
    if (savedCount > 0) return saved;
  }

  const richest = counts.reduce(
    (best, row) => (row.count > best.count ? row : best),
    { id: options[0].id, count: 0 },
  );

  return richest.count > 0 ? richest.id : options[0].id;
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

      let tenantId = await resolveTenantIdForAdmin(selectedTenant?.id, roleData?.tenant_id ?? null);

      if (!tenantId) {
        if (active) {
          setStores([]);
          setSelectedStoreId(null);
          setLoading(false);
        }
        return;
      }

      const storeOptions = await fetchActiveStoresForTenant(tenantId);
      const options: AdminStoreOption[] = storeOptions.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
      }));
      setStores(options);

      const resolved = await resolveInitialStoreId(options, tenantId);

      if (active) {
        setSelectedStoreId(resolved);
        setLoading(false);
      }
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
