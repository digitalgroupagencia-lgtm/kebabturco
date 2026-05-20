import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a store_id correta para o totem/app público com base em:
 *   1. custom_domain (ex.: cliente.com)
 *   2. domínio mestre + primeiro segmento do path (ex.: dominiomaster.com/kebabturco)
 *   3. fallback: primeira store ativa (modo demo)
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
    const host = window.location.hostname;
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const firstSeg = pathSegments[0] || null;

    (async () => {
      // 1) Match por custom_domain exato
      let tenant: any = null;
      if (host) {
        const { data } = await supabase
          .from("tenants")
          .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
          .eq("custom_domain", host)
          .eq("is_active", true)
          .maybeSingle();
        if (data) tenant = data;
      }

      // 2) Match por master_domain + path_slug
      if (!tenant && firstSeg) {
        const { data } = await supabase
          .from("tenants")
          .select("id, slug, path_slug, custom_domain, master_domain, use_master_domain")
          .eq("path_slug", firstSeg)
          .eq("use_master_domain", true)
          .eq("is_active", true)
          .maybeSingle();
        if (data) tenant = data;
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
        stores = (list || []).map((s: any) => ({
          id: s.id, name: s.name, address: s.address,
          image_url: s.image_url, short_description: s.short_description,
        }));
        storeId = stores[0]?.id ?? null;
        if (tenant.use_master_domain && tenant.path_slug) basePath = "/" + tenant.path_slug;
      } else {
        // Fallback: primeira store ativa (modo demo / preview)
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
            id: store.id, name: store.name, address: store.address,
            image_url: store.image_url, short_description: store.short_description,
          }];
          const { data: t } = await supabase
            .from("tenants").select("id, slug").eq("id", store.tenant_id).maybeSingle();
          tenant = t;
        }
      }

      if (!active) return;
      // Restaurar seleção persistida (se ainda é válida para esse tenant)
      let selected: string | null = null;
      try {
        const saved = localStorage.getItem(SELECTED_STORE_KEY);
        if (saved && stores.some((s) => s.id === saved)) selected = saved;
      } catch {}
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
    } catch {}
  }, []);

  const value = useMemo<ResolvedStore>(() => ({ ...state, setSelectedStoreId }), [state, setSelectedStoreId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResolvedStore() {
  return useContext(Ctx);
}