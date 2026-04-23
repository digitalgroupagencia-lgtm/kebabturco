import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SellerCtx {
  userId: string | null;
  fullName: string | null;
  storeId: string | null;
  tenantId: string | null;
  loading: boolean;
}

export function useSellerContext(): SellerCtx {
  const [state, setState] = useState<SellerCtx>({
    userId: null, fullName: null, storeId: null, tenantId: null, loading: true,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setState((s) => ({ ...s, loading: false })); return; }
      const [{ data: role }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("store_id, tenant_id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      let storeId = (role as any)?.store_id ?? null;
      const tenantId = (role as any)?.tenant_id ?? null;
      // Fallback: se vendedor não tem store_id, pega a primeira store do tenant
      if (!storeId && tenantId) {
        const { data: s } = await supabase.from("stores").select("id").eq("tenant_id", tenantId).order("created_at").limit(1).maybeSingle();
        storeId = (s as any)?.id ?? null;
      }
      if (mounted) setState({
        userId: user.id,
        fullName: (profile as any)?.full_name ?? user.email ?? null,
        storeId, tenantId, loading: false,
      });
    })();
    return () => { mounted = false; };
  }, []);

  return state;
}
