import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/lib/staffPermissions";

type AppRole = StaffRole;

interface UserRoleData {
  role: AppRole;
  tenant_id: string | null;
  store_id: string | null;
}

type RoleState = {
  userId: string | null;
  roleData: UserRoleData | null;
  loading: boolean;
  error: string | null;
};

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

const roleListeners = new Set<(state: RoleState) => void>();
let roleState: RoleState = {
  userId: null,
  roleData: null,
  loading: false,
  error: null,
};
let inFlight: Promise<void> | null = null;

function publishRole(next: RoleState) {
  roleState = next;
  roleListeners.forEach((listener) => listener(roleState));
}

function resetRoleState(userId: string | null) {
  publishRole({
    userId,
    roleData: null,
    loading: false,
    error: null,
  });
}

async function loadRole(userId: string) {
  publishRole({
    userId,
    roleData: roleState.userId === userId ? roleState.roleData : null,
    loading: true,
    error: null,
  });

  const rpcRole = await fetchRoleViaRpc();
  if (rpcRole) {
    publishRole({
      userId,
      roleData: rpcRole,
      loading: false,
      error: null,
    });
    return;
  }

  const { data, error: queryError } = await supabase
    .from("user_roles")
    .select("role, tenant_id, store_id")
    .eq("user_id", userId);

  if (!queryError && data?.length) {
    publishRole({
      userId,
      roleData: pickRoleData(data as UserRoleData[]),
      loading: false,
      error: null,
    });
    return;
  }

  publishRole({
    userId,
    roleData: null,
    loading: false,
    error: queryError?.message ?? "Perfil de acesso não encontrado.",
  });
}

function ensureRoleLoaded(userId: string) {
  if (
    roleState.userId === userId &&
    !roleState.loading &&
    (roleState.roleData || roleState.error)
  ) {
    return;
  }
  if (inFlight && roleState.userId === userId) return;

  inFlight = loadRole(userId).finally(() => {
    inFlight = null;
  });
}

export function useUserRole(userId: string | undefined) {
  const [state, setState] = useState<RoleState>(roleState);

  useEffect(() => {
    if (!userId) {
      resetRoleState(null);
      setState(roleState);
      return;
    }

    roleListeners.add(setState);
    setState(roleState);
    ensureRoleLoaded(userId);

    return () => {
      roleListeners.delete(setState);
    };
  }, [userId]);

  return { roleData: state.roleData, loading: state.loading, error: state.error };
}
