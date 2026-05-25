import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { nav } from "@/lib/navPaths.ts";
import { canUseRestaurantPanel, redirectTargetForPanelPath } from "@/lib/panelAccess";
import { Loader2 } from "lucide-react";

type Props = {
  children: ReactNode;
};

/** Bloqueia rotas de configuração em /panel e redirecciona conforme o perfil. */
export default function PanelAccessGuard({ children }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;

    const role = roleData?.role;

    if (role === "seller") {
      navigate(nav.seller(), { replace: true });
      return;
    }

    if (!canUseRestaurantPanel(role)) {
      navigate(nav.auth(), { replace: true });
      return;
    }

    const target = redirectTargetForPanelPath(pathname, role);
    if (target && target !== pathname) {
      navigate(target, { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, pathname, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = roleData?.role;
  const blockedTarget = redirectTargetForPanelPath(pathname, role);
  if (blockedTarget && blockedTarget !== pathname) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
