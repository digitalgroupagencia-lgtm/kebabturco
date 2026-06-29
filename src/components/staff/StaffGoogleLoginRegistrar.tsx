import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import { ensureStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import {
  hasStaffGoogleLoginIntent,
  consumeStaffGoogleLoginIntent,
} from "@/lib/staffGoogleLoginIntent";
import {
  registerStaffGoogleLoginWithRetry,
  userHasAnyStaffRole,
  userHasRoleAtStore,
  userSignedInWithGoogle,
} from "@/services/staffGoogleLogin";
import { nav } from "@/lib/navPaths";

/**
 * Garante que cada login Google da equipa cria/atualiza o pedido pendente na base de dados,
 * mesmo que o ecrã de login monte/desmonte durante o redirect OAuth.
 */
export default function StaffGoogleLoginRegistrar() {
  const { user, loading } = useAuth();
  const { storeId, loading: storeLoading } = useStaffLoginStore();
  const location = useLocation();
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || storeLoading || !user) return;
    if (!location.pathname.startsWith(nav.staff())) return;
    if (!userSignedInWithGoogle(user) && !hasStaffGoogleLoginIntent()) return;

    const dedupeKey = `${user.id}:${storeId ?? "pending-store"}`;
    if (inflightRef.current === dedupeKey) return;
    inflightRef.current = dedupeKey;

    void (async () => {
      try {
        const resolvedStoreId = storeId ?? (await ensureStaffLoginStoreId());
        const alreadyAtStore =
          (await userHasRoleAtStore(user.id, resolvedStoreId)) ||
          (await userHasAnyStaffRole(user.id));
        if (alreadyAtStore) {
          consumeStaffGoogleLoginIntent();
          return;
        }
        await registerStaffGoogleLoginWithRetry(resolvedStoreId);
        consumeStaffGoogleLoginIntent();
      } catch (err) {
        console.error("[staff-google] register failed", err);
      } finally {
        if (inflightRef.current === dedupeKey) inflightRef.current = null;
      }
    })();
  }, [loading, storeLoading, user, storeId, location.pathname]);

  return null;
}
