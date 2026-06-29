import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  isStaffSessionFlagSet,
  resolveStaffLoginDestination,
  shouldRedirectRootToStaffPanel,
} from "@/lib/staffLogin";

/**
 * Em `/`, se houver sessão de staff activa, redirecciona para o painel
 * correspondente em vez de mostrar o fluxo do cliente. Mantém o tablet do
 * restaurante sempre no painel, só sai com logout explícito.
 */
export default function StaffSessionRootRedirect({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (
      !shouldRedirectRootToStaffPanel({
        pathname,
        staffSessionFlag: isStaffSessionFlagSet(),
        hasUser: Boolean(user),
      })
    ) {
      return;
    }
    const dest = resolveStaffLoginDestination(roleData?.role ?? null);
    if (dest && dest !== "/") {
      navigate(dest, { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, navigate, pathname]);

  return <>{children}</>;
}
