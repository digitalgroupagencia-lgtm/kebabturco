import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { nav } from "@/lib/navPaths.ts";
import { canAccessDeliveryPanel } from "@/lib/staffPermissions";
import { Loader2 } from "lucide-react";

type Props = { children: ReactNode };

function authRedirectPath(returnPath: string): string {
  return `${nav.auth()}?next=${encodeURIComponent(returnPath)}`;
}

export default function DeliveryAccessGuard({ children }: Props) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const returnPath = `${pathname}${search}`;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(nav.staff(), { replace: true });
      return;
    }
    if (roleLoading) return;

    const role = roleData?.role ?? null;

    if (role === "seller") {
      navigate(nav.seller(), { replace: true });
      return;
    }

    if (role && role !== "delivery" && role !== "admin_master") {
      navigate(nav.panel(), { replace: true });
      return;
    }

    if (!role || !canAccessDeliveryPanel(role)) {
      navigate(authRedirectPath(returnPath), { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, pathname, returnPath, navigate]);

  if (authLoading || roleLoading || !user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const role = roleData?.role;
  if (!role || !canAccessDeliveryPanel(role)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return <>{children}</>;
}
