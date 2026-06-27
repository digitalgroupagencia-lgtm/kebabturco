import { useEffect, type ComponentType } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSellerModuleEnabled } from "@/hooks/useSellerModule";
import { Loader2, Home, Table as TableIcon, ListOrdered, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import SellerOnboardingGate from "@/components/seller/SellerOnboardingGate";
import { nav } from "@/lib/navPaths";

type Props = {
  page?: ComponentType<object>;
};

const SellerLayout = ({ page: Page }: Props) => {
  const { user, loading, signOut } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { enabled: sellerEnabled, isLoading: flagLoading } = useSellerModuleEnabled(roleData?.tenant_id);
  const navigate = useNavigate();
  const location = useLocation();
  const isMenuRoute = location.pathname.replace(/\/+$/, "").endsWith("/seller/new");

  useEffect(() => {
    if (!loading && !user) navigate(nav.staff(), { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!roleLoading && roleData && roleData.role !== "seller") {
      if (roleData.role === "admin_master") navigate(nav.admin());
      else navigate(nav.panel());
    }
  }, [roleLoading, roleData, navigate]);

  if (loading || roleLoading || flagLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  if (!sellerEnabled) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <h1 className="text-xl font-bold">Módulo Vendedor desactivado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O acesso ao app de vendedor foi desactivado pela plataforma para este restaurante.
          Contacte o administrador.
        </p>
        <Button variant="outline" onClick={() => void signOut("/staff")}>
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>
    );
  }

  return (
    <SellerOnboardingGate userId={user.id}>
    <div className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-background">
      {!isMenuRoute && (
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm font-black text-primary">Kebab Turco · Vendedor</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void signOut("/staff")} aria-label="Sair">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
      )}

      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-x-hidden",
          isMenuRoute ? "h-full overflow-hidden" : "overflow-y-auto pb-20",
        )}
      >
        {Page ? <Page /> : <Outlet />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border h-16 flex items-stretch px-2" style={{ paddingBottom: "max(0px,env(safe-area-inset-bottom))" }}>
        {[
          { to: nav.seller(), label: "Início", icon: Home, end: true },
          { to: nav.seller("tables"), label: "Mesas", icon: TableIcon },
          { to: nav.seller("my-orders"), label: "Pedidos", icon: ListOrdered },
        ].map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold rounded-lg ${isActive ? "text-primary" : "text-muted-foreground"}`}
          >
            <it.icon className="w-5 h-5" />
            {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
    </SellerOnboardingGate>
  );
};

export default SellerLayout;
