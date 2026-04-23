import { useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Home, Table as TableIcon, ListOrdered, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const SellerLayout = () => {
  const { user, loading, signOut } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!roleLoading && roleData && roleData.role !== "seller") {
      // não é vendedor — manda pro lugar certo
      if (roleData.role === "admin_master") navigate("/admin");
      else navigate("/panel");
    }
  }, [roleLoading, roleData, navigate]);

  if (loading || roleLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col max-w-full overflow-x-hidden">
      <header className="sticky top-0 z-30 h-12 px-3 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-primary text-sm">SnapOrder · Vendedor</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border h-16 flex items-stretch px-2" style={{ paddingBottom: "max(0px,env(safe-area-inset-bottom))" }}>
        {[
          { to: "/seller", label: "Início", icon: Home, end: true },
          { to: "/seller/tables", label: "Mesas", icon: TableIcon },
          { to: "/seller/my-orders", label: "Pedidos", icon: ListOrdered },
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
  );
};

export default SellerLayout;
