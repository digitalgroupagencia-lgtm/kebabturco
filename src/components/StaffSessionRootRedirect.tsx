import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  isStaffSessionFlagSet,
  resolveStaffLoginDestination,
  shouldRedirectRootToStaffPanel,
  clearStaffSessionFlag,
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
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (roleLoading) return;
    if (roleData?.role === "admin_master") {
      clearStaffSessionFlag();
    }
  }, [roleData?.role, roleLoading]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (
      !shouldRedirectRootToStaffPanel({
        pathname,
        staffSessionFlag: isStaffSessionFlagSet(),
        hasUser: Boolean(user),
        search,
        role: roleData?.role ?? null,
      })
    ) {
      return;
    }
    const dest = resolveStaffLoginDestination(roleData?.role ?? null);
    if (dest && dest !== "/") {
      navigate(dest, { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, navigate, pathname, search]);

  return <>{children}</>;
}
