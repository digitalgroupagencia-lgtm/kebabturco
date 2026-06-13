import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isCustomerStorefrontPath } from "@/lib/appRouteKind";
import { nav } from "@/lib/navPaths";
import { canAccessGeneralAdmin } from "@/lib/staffPermissions";
import { Button } from "@/components/ui/button";

/** Atalho só para admin_master no cardápio público — equipa do restaurante não vê. */
export default function AdminMasterStorefrontBack() {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  if (authLoading || roleLoading || !user || !canAccessGeneralAdmin(roleData?.role)) {
    return null;
  }
  if (!isCustomerStorefrontPath(location.pathname)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex justify-start px-3"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pointer-events-auto h-9 gap-1.5 rounded-full border border-border/60 bg-background/95 px-3 text-xs font-bold shadow-md backdrop-blur-sm"
        onClick={() => navigate(nav.admin())}
        aria-label="Voltar à administração geral"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Admin geral
      </Button>
    </div>
  );
}
