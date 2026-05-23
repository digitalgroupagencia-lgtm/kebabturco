import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminMasterHost, normalizeHostname } from "@/lib/platformHosts";

/**
 * Resolve a store_id correta para o totem/app público com base em:
 *   1. custom_domain (ex.: kebabturco.net)
 *   2. domínio mestre + path_slug (ex.: dominio.com/kebabturco)
 *   3. fallback: primeira store ativa (modo demo — evitar em produção)
 *
 * Esse hook NÃO depende de auth — funciona para visitantes anônimos.
 */

export interface StoreOption {
  id: string;
  name: string;
  address: string | null;
  image_url: string | null;
  short_description: string | null;
}

interface ResolvedStore {
  /** Store primária do tenant — usada para branding, idiomas e totem_config (compartilhado entre unidades). */
  storeId: string | null;
  /** Store selecionada pelo cliente quando o tenant tem 2+ unidades. Cai no storeId quando há só uma. */
  selectedStoreId: string | null;
  /** Lista de stores ativas do tenant (>= 2 dispara a tela de escolha de unidade). */
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

/** Fallback de emergência — evita totem em branco se a resolução falhar. */
const HOST_STORE_FALLBACK: Record<string, { tenantId: string; tenantSlug: string; storeId: string }> = {
  "kebabturco.net": {
    tenantId: "11111111-1111-1111-1111-111111111111",
    tenantSlug: "kebab-turco",
    storeId: "22222222-2222-2222-2222-222222222222",
  },
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

  // Compat: view stores_public ausente ou erro transitório
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
    const firstSeg = pathSegments[0] || null;
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get("tenant");

    if (isAdminMasterHost(host)) {
      setState({
        storeId: null,
        selectedStoreId: null,
        stores: [],
        tenantId: null,
        tenantSlug: null,
        basePath: "",
        loading: false,
      });
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!active) return;
      const hostFallback = HOST_STORE_FALLBACK[host];
      if (!hostFallback) return;
      setState({
        storeId: hostFallback.storeId,
        selectedStoreId: hostFallback.storeId,
        stores: [{
          id: hostFallback.storeId,
          name: "Gandia",
          address: null,
          image_url: null,
          short_description: null,
        }],
        tenantId: hostFallback.tenantId,
        tenantSlug: hostFallback.tenantSlug,
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
        const { data } = await supabase
          .from("tenants")
          .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
          .eq("slug", tenantParam)
          .maybeSingle();
        if (data) tenant = data as TenantRow;
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

      if (!tenant && firstSeg) {
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
      } else {
        const list = await fetchActiveStores();
        const store = list[0];
        if (store) {
          storeId = store.id;
          stores = mapStoreOptions([store]);
          const { data: t } = await supabase
            .from("tenants")
            .select("id, slug")
            .eq("id", store.tenant_id!)
            .maybeSingle();
          tenant = t as TenantRow | null;
        }
      }

      const hostFallback = HOST_STORE_FALLBACK[host];
      if (!storeId && hostFallback) {
        storeId = hostFallback.storeId;
        if (!tenant) {
          tenant = {
            id: hostFallback.tenantId,
            slug: hostFallback.tenantSlug,
            path_slug: null,
            custom_domain: host,
            master_domain: null,
            use_master_domain: false,
          };
        }
        if (!stores.length) {
          const list = await fetchActiveStores({ tenantId: hostFallback.tenantId });
          stores = mapStoreOptions(list.length ? list : [{
            id: hostFallback.storeId,
            name: "Gandia",
            address: null,
            image_url: null,
            short_description: null,
          }]);
        }
      }
      } catch (err) {
        console.error("[ResolvedStore] tenant/store resolution failed", err);
        const hostFallback = HOST_STORE_FALLBACK[host];
        if (hostFallback) {
          storeId = hostFallback.storeId;
          tenant = {
            id: hostFallback.tenantId,
            slug: hostFallback.tenantSlug,
            path_slug: null,
            custom_domain: host,
            master_domain: null,
            use_master_domain: false,
          };
          stores = [{
            id: hostFallback.storeId,
            name: "Gandia",
            address: null,
            image_url: null,
            short_description: null,
          }];
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
