import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || storeLoading || !user) return;
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
        if (!alreadyAtStore) {
          await registerStaffGoogleLoginWithRetry(resolvedStoreId);
        }
        consumeStaffGoogleLoginIntent();
        // After Google OAuth lands on "/", bounce the staff member to /staff so the
        // approval/pending screen mounts and the manager sees the pending request.
        if (!location.pathname.startsWith(nav.staff())) {
          let next: string | null = null;
          try { next = sessionStorage.getItem("kebab-staff-google-next"); } catch { /* ignore */ }
          try { sessionStorage.removeItem("kebab-staff-google-next"); } catch { /* ignore */ }
          const target = next && next.startsWith("/") ? next : nav.staff();
          navigate(target, { replace: true });
        }
      } catch (err) {
        console.error("[staff-google] register failed", err);
      } finally {
        if (inflightRef.current === dedupeKey) inflightRef.current = null;
      }
    })();
  }, [loading, storeLoading, user, storeId, location.pathname, navigate]);

  return null;
}
