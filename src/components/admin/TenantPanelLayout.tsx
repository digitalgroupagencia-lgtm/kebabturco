import { useEffect } from "react";
import { useNavigate, Outlet, NavLink as RRNavLink, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TenantPanelSidebar } from "./TenantPanelSidebar";
import AdminAssistant from "./AdminAssistant";
import AdminThemeToggle from "./AdminThemeToggle";
import { Loader2, ArrowLeft, Building2, Crown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectedTenantProvider, useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useTenantEditLock } from "@/hooks/useTenantEditLock";
import { Pencil, Lock } from "lucide-react";

function TenantHeaderInner() {
  const { tenant, loading } = useSelectedTenant();
  const navigate = useNavigate();
  const { locked, lockedByOther, message } = useTenantEditLock(tenant?.id);
  const totemUrl = tenant?.custom_domain
    ? `https://${tenant.custom_domain}/`
    : `${window.location.origin}/${tenant?.slug ?? ""}`;
  return (
    <>
    <header className="sticky top-0 z-30 h-14 flex items-center gap-2 border-b px-3 sm:px-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <SidebarTrigger className="shrink-0" />
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 px-2"
        onClick={() => navigate("/admin/tenants")}
      >
        <ArrowLeft className="w-4 h-4 sm:mr-1" />
        <span className="hidden sm:inline">Clientes</span>
      </Button>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <h1 className="text-sm sm:text-base font-bold truncate">
          {loading ? "Carregando…" : tenant?.name ?? "Cliente não encontrado"}
        </h1>
        {locked && (
          <Badge className="bg-amber-500 text-white hover:bg-amber-500 gap-1 text-[10px]">
            <Pencil className="w-3 h-3" /> Editando
          </Badge>
        )}
        {lockedByOther && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <Lock className="w-3 h-3" /> Bloqueado
          </Badge>
        )}
        <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-[10px]">
          <Crown className="w-3 h-3 text-primary" /> Admin Master
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        asChild
        title="Abrir totem do cliente em nova aba"
      >
        <a href={totemUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ver totem</span>
        </a>
      </Button>
      <AdminThemeToggle />
    </header>
    {lockedByOther && (
      <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-xs text-destructive">
        {message ?? "Outro admin está editando este projeto. Mudanças podem entrar em conflito."}
      </div>
    )}
    </>
  );
}

const TenantPanelLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !roleLoading && roleData && roleData.role !== "admin_master") {
      navigate("/panel");
    }
  }, [authLoading, roleLoading, roleData, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || roleData?.role !== "admin_master") return null;

  return (
    <SelectedTenantProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
          <TenantPanelSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TenantHeaderInner />
            <main className="flex-1 p-4 sm:p-6 bg-secondary/50 overflow-x-hidden overflow-y-auto">
              <Outlet />
            </main>
          </div>
          <AdminAssistant />
        </div>
      </SidebarProvider>
    </SelectedTenantProvider>
  );
};

export default TenantPanelLayout;