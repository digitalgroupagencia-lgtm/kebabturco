import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PanelSidebar } from "./PanelSidebar";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import { Loader2 } from "lucide-react";
import TenantLimitBanner from "./TenantLimitBanner";

const PanelLayout = () => {
  const { user, loading } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
        <PanelSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 flex items-center border-b px-3 sm:px-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <SidebarTrigger className="mr-2 sm:mr-4" />
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate flex-1">Painel do Restaurante</h1>
            <AdminThemeToggle />
          </header>
          <main className="flex-1 p-4 sm:p-6 bg-secondary/50 overflow-x-hidden overflow-y-auto">
            {roleData?.tenant_id && <TenantLimitBanner tenantId={roleData.tenant_id} />}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PanelLayout;
