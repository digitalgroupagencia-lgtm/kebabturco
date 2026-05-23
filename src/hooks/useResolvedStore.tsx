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

    (async () => {
      let tenant: TenantRow | null = null;

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

      let storeId: string | null = null;
      let basePath = "";
      let stores: StoreOption[] = [];

      if (tenant) {
        const { data: list } = await supabase
          .from("stores")
          .select("id, name, address, image_url, short_description, sort_order, created_at")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        stores = (list || []).map((s: StoreOption) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          image_url: s.image_url,
          short_description: s.short_description,
        }));
        storeId = stores[0]?.id ?? null;
        if (tenant.use_master_domain && tenant.path_slug && !tenant.custom_domain) {
          basePath = "/" + tenant.path_slug;
        } else if (tenant.use_master_domain && tenant.path_slug && tenant.custom_domain) {
          const onMaster = tenant.master_domain && host === normalizeHostname(tenant.master_domain);
          if (onMaster) basePath = "/" + tenant.path_slug;
        }
      } else {
        const { data: store } = await supabase
          .from("stores")
          .select("id, name, address, image_url, short_description, tenant_id")
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        if (store) {
          storeId = store.id;
          stores = [{
            id: store.id,
            name: store.name,
            address: store.address,
            image_url: store.image_url,
            short_description: store.short_description,
          }];
          const { data: t } = await supabase
            .from("tenants")
            .select("id, slug")
            .eq("id", store.tenant_id)
            .maybeSingle();
          tenant = t as TenantRow | null;
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
    return () => { active = false; };
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
