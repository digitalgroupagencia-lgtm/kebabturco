import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Edit-mode lock: garante que enquanto você edita um tenant (Kebab Turco),
 * nenhum outro admin esteja mexendo no mesmo projeto simultaneamente.
 * O lock expira em 30min de inatividade e é renovado a cada 5min.
 */
export function useTenantEditLock(tenantId: string | null | undefined) {
  const [locked, setLocked] = useState(false);
  const [lockedByOther, setLockedByOther] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const acquire = async () => {
      const { data } = await supabase.rpc("acquire_tenant_edit_lock", { _tenant_id: tenantId });
      if (!active) return;
      const result = data as { success: boolean; message?: string } | null;
      if (result?.success) {
        setLocked(true);
        setLockedByOther(false);
        setMessage(null);
      } else {
        setLocked(false);
        setLockedByOther(true);
        setMessage(result?.message ?? "Projeto bloqueado por outro admin");
      }
    };
    acquire();
    const renew = setInterval(acquire, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(renew);
      supabase.rpc("release_tenant_edit_lock", { _tenant_id: tenantId }).then(() => {});
    };
  }, [tenantId]);

  return { locked, lockedByOther, message };
}