import { ArrowLeft, Radio, UtensilsCrossed } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isCustomerStorefrontPath } from "@/lib/appRouteKind";
import { nav } from "@/lib/navPaths";
import { canAccessGeneralAdmin } from "@/lib/staffPermissions";
import {
  markAdminStaffAreaEntry,
  markStaffSessionForRole,
  openCustomerStorefrontFromStaff,
  openStaffLivePanel,
} from "@/lib/staffLogin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Barra do painel/admin ou botões flutuantes no cardápio */
  mode?: "inline" | "overlay";
};

const pillBase =
  "h-9 shrink-0 gap-1.5 rounded-full px-2.5 sm:px-3 text-xs font-bold touch-manipulation";

export default function AdminMasterQuickNav({ mode = "inline" }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  if (authLoading || roleLoading || !user || !canAccessGeneralAdmin(roleData?.role)) {
    return null;
  }

  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const onCustomer = isCustomerStorefrontPath(pathname);
  const onAdmin = pathname.startsWith("/admin");
  const onPanel = pathname.startsWith("/panel");
  const onLive = pathname === "/panel" || pathname === "/panel/live";

  if (mode === "overlay" && !onCustomer) return null;

  const pillClass = cn(
    pillBase,
    mode === "overlay" && "border border-border/60 bg-background/95 shadow-md backdrop-blur-sm",
  );

  const cardapioBtn = (onAdmin || onPanel) && (
    <Button
      type="button"
      variant={mode === "overlay" ? "secondary" : "outline"}
      size="sm"
      className={pillClass}
      onClick={() => openCustomerStorefrontFromStaff(navigate)}
    >
      <UtensilsCrossed className="h-4 w-4 shrink-0" />
      Cardápio
    </Button>
  );

  const painelBtn = (onAdmin || onCustomer || (onPanel && !onLive)) && (
    <Button
      type="button"
      variant={mode === "overlay" ? "secondary" : onLive ? "default" : "outline"}
      size="sm"
      className={pillClass}
      onClick={() => openStaffLivePanel(navigate, roleData?.role)}
    >
      <Radio className="h-4 w-4 shrink-0" />
      <span className="hidden min-[380px]:inline">Painel ao vivo</span>
      <span className="min-[380px]:hidden">Painel</span>
    </Button>
  );

  const adminBtn = (onPanel || onCustomer) && (
    <Button
      type="button"
      variant={mode === "overlay" ? "secondary" : "outline"}
      size="sm"
      className={pillClass}
      onClick={() => {
        markAdminStaffAreaEntry();
        markStaffSessionForRole(roleData?.role);
        navigate(nav.admin());
      }}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="hidden min-[380px]:inline">Admin geral</span>
      <span className="min-[380px]:hidden">Admin</span>
    </Button>
  );

  if (mode === "overlay") {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex items-start justify-between gap-2 px-3"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto flex flex-wrap gap-1.5">{adminBtn}</div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">{painelBtn}</div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {adminBtn}
      {cardapioBtn}
      {painelBtn}
    </div>
  );
}
