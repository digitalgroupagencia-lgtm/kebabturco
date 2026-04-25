import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a store_id correta para o totem/app público com base em:
 *   1. custom_domain (ex.: cliente.com)
 *   2. domínio mestre + primeiro segmento do path (ex.: dominiomaster.com/kebabturco)
 *   3. fallback: primeira store ativa (modo demo)
 *
 * Esse hook NÃO depende de auth — funciona para visitantes anônimos.
 */

interface ResolvedStore {
  storeId: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  basePath: string;       // "" ou "/kebabturco" — para o frontend montar links corretos
  loading: boolean;
}

const Ctx = createContext<ResolvedStore>({
  storeId: null,
  tenantId: null,
  tenantSlug: null,
  basePath: "",
  loading: true,
});

export function ResolvedStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResolvedStore>({
    storeId: null, tenantId: null, tenantSlug: null, basePath: "", loading: true,
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

      if (tenant) {
        const { data: store } = await supabase
          .from("stores")
          .select("id")
          .eq("tenant_id", tenant.id)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        storeId = store?.id ?? null;
        if (tenant.use_master_domain && tenant.path_slug) basePath = "/" + tenant.path_slug;
      } else {
        // Fallback: primeira store ativa (modo demo / preview)
        const { data: store } = await supabase
          .from("stores")
          .select("id, tenant_id")
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        if (store) {
          storeId = store.id;
          const { data: t } = await supabase
            .from("tenants").select("id, slug").eq("id", store.tenant_id).maybeSingle();
          tenant = t;
        }
      }

      if (!active) return;
      setState({
        storeId,
        tenantId: tenant?.id ?? null,
        tenantSlug: tenant?.slug ?? null,
        basePath,
        loading: false,
      });
    })();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => state, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResolvedStore() {
  return useContext(Ctx);
}