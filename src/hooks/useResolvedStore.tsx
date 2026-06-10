import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isReservedAppPath } from "@/lib/appPaths";
import { isLovableEditorHost, normalizeHostname } from "@/lib/platformHosts";
import { getStoreTenantSlug } from "@/lib/tenantPreview";
import { preferResolvedStores, type StoreOption } from "@/lib/storeResolution";

/**
 * Resolve store_id para a loja pública (SaaS multi-tenant):
 *   1. prévia (?tenant= ou /preview/slug) — ambiente de editor/preview
 *   2. custom_domain do tenant
 *   3. master_domain + path_slug
 *   4. primeiro segmento do path como slug do tenant (quando não reservado)
 *   5. em ambiente de editor Lovable (sem domínio real): tenant template
 * Em qualquer outro domínio desconhecido: NÃO há fallback — o consumidor
 * deve renderizar DomainNotConfiguredScreen.
 */

export type { StoreOption };

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

type StorePublicRow = StoreOption & {
  tenant_id?: string;
  sort_order?: number;
  created_at?: string;
};

async function fetchActiveStores(filter: { tenantId?: string } = {}): Promise<StorePublicRow[]> {
  const select =
    "id, name, address, image_url, short_description, sort_order, created_at, tenant_id";
  const db = supabase as unknown as {
    from: (table: string) => any;
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

  let rows = (!error && data?.length ? data : []) as StorePublicRow[];

  if (!rows.length) {
    const legacyQuery = supabase
      .from("stores")
      .select(select)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const legacy = filter.tenantId
      ? await legacyQuery.eq("tenant_id", filter.tenantId)
      : await legacyQuery;

    rows = (legacy.data || []) as StorePublicRow[];
  }

  if (rows.length && filter.tenantId) {
    const missingImages = rows.some((row) => !row.image_url);
    if (missingImages) {
      const { data: enriched } = await supabase
        .from("stores")
        .select("id, name, address, image_url, short_description")
        .eq("tenant_id", filter.tenantId)
        .eq("is_active", true);

      if (enriched?.length) {
        const byId = new Map(enriched.map((row) => [row.id, row]));
        rows = rows.map((row) => {
          const full = byId.get(row.id);
          if (!full) return row;
          return {
            ...row,
            name: row.name || full.name,
            address: row.address ?? full.address,
            image_url: row.image_url ?? full.image_url,
            short_description: row.short_description ?? full.short_description,
          };
        });
      }
    }
  }

  return rows;
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

function resolveSelectedStoreId(stores: StoreOption[]): string | null {
  try {
    const saved = localStorage.getItem(SELECTED_STORE_KEY);
    if (saved && stores.some((s) => s.id === saved)) return saved;
  } catch {
    // ignore
  }
  if (stores.length === 1) return stores[0].id;
  return null;
}

type ResolvedPayload = Omit<ResolvedStore, "setSelectedStoreId">;

function commitResolvedState(prev: ResolvedPayload, next: ResolvedPayload): ResolvedPayload {
  const stores = preferResolvedStores(prev.stores, next.stores);
  const storeId =
    next.storeId && stores.some((s) => s.id === next.storeId)
      ? next.storeId
      : stores[0]?.id ?? next.storeId;

  let selectedStoreId = next.selectedStoreId;
  if (selectedStoreId && !stores.some((s) => s.id === selectedStoreId)) {
    selectedStoreId = resolveSelectedStoreId(stores);
  }
  if (!selectedStoreId) {
    selectedStoreId = resolveSelectedStoreId(stores);
  }

  return {
    storeId,
    selectedStoreId,
    stores,
    tenantId: next.tenantId ?? prev.tenantId,
    tenantSlug: next.tenantSlug ?? prev.tenantSlug,
    basePath: next.basePath || prev.basePath,
    loading: next.loading,
  };
}

function createInitialStoreState(): Omit<ResolvedStore, "setSelectedStoreId"> {
  return {
    storeId: null,
    selectedStoreId: null,
    stores: [],
    tenantId: null,
    tenantSlug: null,
    basePath: "",
    loading: true,
  };
}

export function ResolvedStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<ResolvedStore, "setSelectedStoreId">>(createInitialStoreState);

  useEffect(() => {
    let active = true;
    const host = normalizeHostname(window.location.hostname);
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const firstSeg = pathSegments[0] === "preview" ? pathSegments[1] || null : pathSegments[0] || null;
    const tenantParam = getStoreTenantSlug();

    // Em editor Lovable, evitamos esperar 10s antes de mostrar o tenant template;
    // se a resolução demorar, paramos o loading sem fallback de produção.
    const emergencyTimeout = window.setTimeout(() => {
      if (!active) return;
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
    }, isLovableEditorHost(host) ? 4000 : 10000);

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

        if (!tenant && firstSeg && firstSeg !== "panel" && firstSeg !== "admin" && firstSeg !== "auth" && firstSeg !== "staff") {
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

        if (!tenant && firstSeg && !isReservedAppPath(firstSeg)) {
          tenant = await fetchTenantBySlug(firstSeg);
        }

        // Sem fallback automático para o tenant template.
        // "/" sem tenant resolvido → RootRoute mostra a landing da PropioApp.

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
      } catch (err) {
        console.error("[ResolvedStore] tenant/store resolution failed", err);
      }

      if (!active) return;
      window.clearTimeout(emergencyTimeout);

      const selected = resolveSelectedStoreId(stores);

      setState((prev) =>
        commitResolvedState(prev, {
          storeId,
          selectedStoreId: selected,
          stores,
          tenantId: tenant?.id ?? null,
          tenantSlug: tenant?.slug ?? null,
          basePath,
          loading: false,
        }),
      );
    })();

    return () => {
      active = false;
      window.clearTimeout(emergencyTimeout);
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
