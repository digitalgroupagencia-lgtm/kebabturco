import { type ComponentType } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import AdminAssistant from "./AdminAssistant";
import AdminThemeToggle from "./AdminThemeToggle";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import { Loader2 } from "lucide-react";
import { APP_NAME } from "@/lib/appMode";
import { canAccessGeneralAdmin } from "@/lib/projectAccess";
import LovableRouteHintBanner from "./LovableRouteHintBanner";
import OperationalDiagnosticsBanner from "@/components/ops/OperationalDiagnosticsBanner";
import { nav } from "@/lib/navPaths.ts";
import { SelectedTenantProvider } from "@/contexts/SelectedTenantContext";
import { AdminStoreProvider } from "@/contexts/AdminStoreContext";

type Props = {
  page?: ComponentType<object>;
};

const AdminLayout = ({ page: Page }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading, error: roleError } = useUserRole(user?.id);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={nav.auth()} replace />;
  }

  if (!roleData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-lg font-bold">Sem acesso de administrador geral</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {roleError ?? "A sua conta não tem perfil de admin geral. Use o painel do restaurante ou peça ao suporte."}
        </p>
        <a href={nav.panel()} className="text-sm font-semibold text-primary underline">
          Ir para o painel do restaurante
        </a>
      </div>
    );
  }

  if (!canAccessGeneralAdmin(roleData.role)) {
    return <Navigate to={nav.panel()} replace />;
  }

  return (
    <SelectedTenantProvider>
      <AdminStoreProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="sticky top-0 z-30 h-14 flex items-center border-b px-3 sm:px-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <SidebarTrigger className="mr-2 sm:mr-4" />
                <h1 className="text-base sm:text-lg font-bold text-foreground truncate flex-1">
                  {APP_NAME} · Administração
                </h1>
                <StaffLanguageToggle defaultLang="pt" compact />
                <AdminThemeToggle />
              </header>
              <main className="flex-1 p-4 sm:p-6 bg-secondary/50 overflow-x-hidden overflow-y-auto">
                <div className="max-w-full mx-auto">
                  <OperationalDiagnosticsBanner area="admin" />
                  <LovableRouteHintBanner />
                  {Page ? <Page /> : <Outlet />}
                </div>
              </main>
            </div>
            <AdminAssistant />
          </div>
        </SidebarProvider>
      </AdminStoreProvider>
    </SelectedTenantProvider>
  );
};

export default AdminLayout;
