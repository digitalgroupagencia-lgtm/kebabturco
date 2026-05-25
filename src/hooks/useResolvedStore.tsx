import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { isDefaultKebabContextHost, normalizeHostname } from "@/lib/platformHosts";
import { getPreviewTenantSlug } from "@/lib/tenantPreview";

/**
 * Resolve store_id para a loja pública:
 *   1. prévia (?tenant= ou /preview/slug)
 *   2. custom_domain (ex.: kebabturco.net)
 *   3. domínio mestre + path_slug
 *   4. contexto Kebab (localhost, Lovable, kebabturco.net) → slug kebab-turco
 *   5. fallback hardcoded de emergência
 */

export interface StoreOption {
  id: string;
  name: string;
  address: string | null;
  image_url: string | null;
  short_description: string | null;
}

interface ResolvedStore {
  storeId: string | null;
  selectedStoreId: string | null;
  stores: StoreOption[];
  setSelectedStoreId: (id: string | null) => void;
  tenantId: string | null;
  tenantSlug: string | null;
  basePath: string;
  loading: boolean;
}

const Ctx = createContext<ResolvedStore>({
  storeId: null,
  selectedStoreId: null,
  stores: [],
  setSelectedStoreId: () => {},
  tenantId: null,
  tenantSlug: null,
  basePath: "",
  loading: true,
});

const SELECTED_STORE_KEY = "totem.selectedStoreId";

const KEBAB_FALLBACK = {
  tenantId: "11111111-1111-1111-1111-111111111111",
  tenantSlug: DEFAULT_TENANT_SLUG,
  storeId: "22222222-2222-2222-2222-222222222222",
};

type StorePublicRow = StoreOption & {
  tenant_id?: string;
  sort_order?: number;
  created_at?: string;
};

async function fetchActiveStores(filter: { tenantId?: string } = {}): Promise<StorePublicRow[]> {
  const select =
    "id, name, address, image_url, short_description, sort_order, created_at, tenant_id";
  const db = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const publicQuery = db
    .from("stores_public")
    .select(select)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data, error } = filter.tenantId
    ? await publicQuery.eq("tenant_id", filter.tenantId)
    : await publicQuery;

  if (!error && data?.length) {
    return data as StorePublicRow[];
  }

  const legacyQuery = supabase
    .from("stores")
    .select(select)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const legacy = filter.tenantId
    ? await legacyQuery.eq("tenant_id", filter.tenantId)
    : await legacyQuery;

  return (legacy.data || []) as StorePublicRow[];
}

function mapStoreOptions(rows: StorePublicRow[]): StoreOption[] {
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    image_url: s.image_url,
    short_description: s.short_description,
  }));
}

type TenantRow = {
  id: string;
  slug: string;
  path_slug: string | null;
  custom_domain: string | null;
  master_domain: string | null;
  use_master_domain: boolean;
};

async function fetchTenantBySlug(slug: string): Promise<TenantRow | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
    .eq("slug", slug)
    .maybeSingle();
  return data as TenantRow | null;
}

function applyKebabFallback(host: string): {
  tenant: TenantRow;
  storeId: string;
  stores: StoreOption[];
} {
  return {
    tenant: {
      id: KEBAB_FALLBACK.tenantId,
      slug: KEBAB_FALLBACK.tenantSlug,
      path_slug: null,
      custom_domain: host || "kebabturco.net",
      master_domain: null,
      use_master_domain: false,
    },
    storeId: KEBAB_FALLBACK.storeId,
    stores: [{
      id: KEBAB_FALLBACK.storeId,
      name: "Kebab Turco",
      address: null,
      image_url: null,
      short_description: null,
    }],
  };
}

export function ResolvedStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<ResolvedStore, "setSelectedStoreId">>({
    storeId: null,
    selectedStoreId: null,
    stores: [],
    tenantId: null,
    tenantSlug: null,
    basePath: "",
    loading: true,
  });

  useEffect(() => {
    let active = true;
    const host = normalizeHostname(window.location.hostname);
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const firstSeg = pathSegments[0] === "preview" ? pathSegments[1] || null : pathSegments[0] || null;
    const tenantParam = getPreviewTenantSlug();

    const timeout = window.setTimeout(() => {
      if (!active) return;
      if (!isDefaultKebabContextHost(host)) return;
      const fb = applyKebabFallback(host);
      setState({
        storeId: fb.storeId,
        selectedStoreId: fb.storeId,
        stores: fb.stores,
        tenantId: fb.tenant.id,
        tenantSlug: fb.tenant.slug,
        basePath: "",
        loading: false,
      });
    }, 5000);

    (async () => {
      let tenant: TenantRow | null = null;
      let storeId: string | null = null;
      let basePath = "";
      let stores: StoreOption[] = [];

      try {
        if (tenantParam) {
          tenant = await fetchTenantBySlug(tenantParam);
        }

        if (!tenant && host) {
          const { data: rows } = await supabase
            .from("tenants")
            .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
            .eq("is_active", true);

          tenant =
            (rows as TenantRow[] | null)?.find((t) => {
              if (!t.custom_domain) return false;
              return normalizeHostname(t.custom_domain) === host;
            }) ?? null;
        }

        if (!tenant && firstSeg && firstSeg !== "panel" && firstSeg !== "admin" && firstSeg !== "auth") {
          const { data: rows } = await supabase
            .from("tenants")
            .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
            .eq("use_master_domain", true)
            .eq("is_active", true);

          tenant =
            (rows as TenantRow[] | null)?.find((t) => {
              const segMatch = t.path_slug === firstSeg || t.slug === firstSeg;
              if (!segMatch || !t.master_domain) return false;
              return normalizeHostname(t.master_domain) === host;
            }) ?? null;
        }

        if (!tenant && isDefaultKebabContextHost(host)) {
          tenant = await fetchTenantBySlug(DEFAULT_TENANT_SLUG);
        }

        if (tenant) {
          const list = await fetchActiveStores({ tenantId: tenant.id });
          stores = mapStoreOptions(list);
          storeId = stores[0]?.id ?? null;
          if (tenant.use_master_domain && tenant.path_slug && !tenant.custom_domain) {
            basePath = "/" + tenant.path_slug;
          } else if (tenant.use_master_domain && tenant.path_slug && tenant.custom_domain) {
            const onMaster = tenant.master_domain && host === normalizeHostname(tenant.master_domain);
            if (onMaster) basePath = "/" + tenant.path_slug;
          }
        }

        if (!storeId && isDefaultKebabContextHost(host)) {
          const fb = applyKebabFallback(host);
          storeId = fb.storeId;
          if (!tenant) tenant = fb.tenant;
          if (!stores.length) {
            const list = await fetchActiveStores({ tenantId: KEBAB_FALLBACK.tenantId });
            stores = mapStoreOptions(
              list.length
                ? list
                : [{
                    id: fb.storeId,
                    name: "Kebab Turco",
                    address: null,
                    image_url: null,
                    short_description: null,
                  }],
            );
          }
        }
      } catch (err) {
        console.error("[ResolvedStore] tenant/store resolution failed", err);
        if (isDefaultKebabContextHost(host)) {
          const fb = applyKebabFallback(host);
          storeId = fb.storeId;
          tenant = fb.tenant;
          stores = fb.stores;
        }
      }

      if (!active) return;

      let selected: string | null = null;
      try {
        const saved = localStorage.getItem(SELECTED_STORE_KEY);
        if (saved && stores.some((s) => s.id === saved)) selected = saved;
      } catch {
        // ignore
      }
      if (!selected && stores.length === 1) selected = stores[0].id;

      setState({
        storeId,
        selectedStoreId: selected,
        stores,
        tenantId: tenant?.id ?? null,
        tenantSlug: tenant?.slug ?? null,
        basePath,
        loading: false,
      });
    })();

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const setSelectedStoreId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedStoreId: id }));
    try {
      if (id) localStorage.setItem(SELECTED_STORE_KEY, id);
      else localStorage.removeItem(SELECTED_STORE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ResolvedStore>(() => ({ ...state, setSelectedStoreId }), [state, setSelectedStoreId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResolvedStore() {
  return useContext(Ctx);
}
