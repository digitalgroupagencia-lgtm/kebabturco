import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Resolve o store_id correto para páginas administrativas:
 *  - /admin/tenants/:slug/... → store da loja desse tenant
 *  - /panel/...               → store do usuário autenticado (via user_roles.tenant_id)
 *  - fallback                 → primeira store ativa
 *
 * Substitui os hardcodes de STORE_ID nas páginas admin/panel.
 */
export function useAdminStoreId(): { storeId: string | null; loading: boolean } {
  const { slug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let resolved: string | null = null;

      // 1. Rota tenant-aware (/admin/tenants/:slug)
      if (slug) {
        const { data: t } = await supabase
          .from("tenants").select("id").eq("slug", slug).maybeSingle();
        if (t) {
          const { data: s } = await supabase
            .from("stores").select("id").eq("tenant_id", t.id).order("created_at").limit(1).maybeSingle();
          resolved = s?.id ?? null;
        }
      }

      // 2. Painel próprio (/panel) → tenant do user
      if (!resolved && user?.id) {
        const { data: role } = await supabase
          .from("user_roles").select("store_id, tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
        if (role?.store_id) {
          resolved = role.store_id;
        } else if (role?.tenant_id) {
          const { data: s } = await supabase
            .from("stores").select("id").eq("tenant_id", role.tenant_id).order("created_at").limit(1).maybeSingle();
          resolved = s?.id ?? null;
        }
      }

      // 3. Fallback final
      if (!resolved) {
        const { data: s } = await supabase
          .from("stores").select("id").eq("is_active", true).order("created_at").limit(1).maybeSingle();
        resolved = s?.id ?? null;
      }

      if (active) {
        setStoreId(resolved);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug, user?.id]);

  return { storeId, loading };
}