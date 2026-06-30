import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/lib/staffPermissions";

type AppRole = StaffRole;

interface UserRoleData {
  role: AppRole;
  tenant_id: string | null;
  store_id: string | null;
}

function pickRoleData(rows: { role: AppRole; tenant_id: string | null; store_id: string | null }[]): UserRoleData | null {
  if (!rows.length) return null;
  const adminMaster = rows.find((role) => role.role === "admin_master");
  if (adminMaster) {
    // Admin geral: tenant/loja vêm do URL ou do projecto, não de outro papel na equipa.
    return { role: "admin_master", tenant_id: null, store_id: null };
  }
  const scopedRole = rows.find((role) => role.store_id || role.tenant_id);
  return {
    role: rows[0].role,
    tenant_id: scopedRole?.tenant_id ?? rows[0].tenant_id,
    store_id: scopedRole?.store_id ?? rows[0].store_id,
  };
}

async function fetchRoleViaRpc(): Promise<UserRoleData | null> {
  const { data, error } = await supabase.rpc("get_my_staff_context" as never);
  if (error || !data || typeof data !== "object") return null;
  const row = data as { role?: AppRole; tenant_id?: string | null; store_id?: string | null };
  if (!row.role) return null;
  if (row.role === "admin_master") {
    return { role: "admin_master", tenant_id: null, store_id: null };
  }
  return {
    role: row.role,
    tenant_id: row.tenant_id ?? null,
    store_id: row.store_id ?? null,
  };
}

export function useUserRole(userId: string | undefined) {
  const [roleData, setRoleData] = useState<UserRoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRoleData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const fetchRole = async () => {
      const rpcRole = await fetchRoleViaRpc();
      if (!active) return;

      if (rpcRole) {
        setRoleData(rpcRole);
        setError(null);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("user_roles")
        .select("role, tenant_id, store_id")
        .eq("user_id", userId);

      if (!active) return;

      if (!queryError && data?.length) {
        setRoleData(pickRoleData(data as UserRoleData[]));
        setError(null);
      } else {
        setRoleData(null);
        setError(queryError?.message ?? "Perfil de acesso não encontrado.");
      }
      setLoading(false);
    };

    void fetchRole();
    return () => {
      active = false;
    };
  }, [userId]);

  return { roleData, loading, error };
}
