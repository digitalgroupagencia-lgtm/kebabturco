import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Tenant = Tables<"tenants">;

/**
 * Resolve o tenant atual com base no hostname.
 * - Se a URL atual bate com algum `tenants.custom_domain`, retorna esse tenant.
 * - Caso contrário, retorna null (modo padrão / multitenant compartilhado).
 */
export function useTenantByDomain() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    if (!host) { setLoading(false); return; }

    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("custom_domain", host)
        .eq("is_active", true)
        .maybeSingle();
      if (active) {
        setTenant(data ?? null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { tenant, loading };
}