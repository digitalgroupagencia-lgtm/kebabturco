import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { nav } from "@/lib/navPaths";
import {
  clearStaffSessionFlag,
  shouldAdminMasterStartAsCustomer,
} from "@/lib/staffLogin";

/**
 * Admin geral: ao reabrir a app (último URL era /admin ou /panel), volta ao cardápio.
 * Só entra no admin nesta sessão após 5 toques na logo ou botões explícitos do painel.
 */
export default function AdminMasterStaffEntryGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!shouldAdminMasterStartAsCustomer({ role: roleData?.role ?? null, pathname })) return;
    clearStaffSessionFlag();
    navigate({ pathname: nav.home(), search: "?screen=language" }, { replace: true });
  }, [authLoading, roleLoading, roleData?.role, pathname, navigate]);

  return <>{children}</>;
}
