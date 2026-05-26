import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/lib/staffPermissions";

type AppRole = StaffRole;

interface UserRoleData {
  role: AppRole;
  tenant_id: string | null;
  store_id: string | null;
}

export function useUserRole(userId: string | undefined) {
  const [roleData, setRoleData] = useState<UserRoleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoleData(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id, store_id")
        .eq("user_id", userId);

      if (!active) return;

      if (!error && data?.length) {
        const adminMaster = data.find((role) => role.role === "admin_master");
        const scopedRole = data.find((role) => role.store_id || role.tenant_id);
        setRoleData({
          role: adminMaster?.role ?? data[0].role,
          tenant_id: scopedRole?.tenant_id ?? adminMaster?.tenant_id ?? data[0].tenant_id,
          store_id: scopedRole?.store_id ?? adminMaster?.store_id ?? data[0].store_id,
        });
      } else {
        setRoleData(null);
      }
      setLoading(false);
    };

    fetchRole();
    return () => {
      active = false;
    };
  }, [userId]);

  return { roleData, loading };
}
