import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

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
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id, store_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setRoleData(data);
      }
      setLoading(false);
    };

    fetchRole();
  }, [userId]);

  return { roleData, loading };
}
