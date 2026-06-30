import { useEffect, type ComponentType } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { nav } from "@/lib/navPaths.ts";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PanelSidebar } from "./PanelSidebar";
import PanelAccessGuard from "./PanelAccessGuard";
import AdminAssistant from "@/components/admin/AdminAssistant";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import { Loader2 } from "lucide-react";
import { SelectedTenantProvider } from "@/contexts/SelectedTenantContext";
import { PanelStoreProvider } from "@/contexts/PanelStoreContext";
import { StaffScreenHelpProvider } from "@/contexts/StaffScreenHelpContext";
import StaffTopBarAlerts from "@/components/staff/StaffTopBarAlerts";
import PanelOldPendingToolbarButton from "@/components/panel/PanelOldPendingToolbarButton";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import PanelUpdateButton from "@/components/panel/PanelUpdateButton";
import AdminMasterPanelBack from "@/components/admin/AdminMasterPanelBack";
import StaffProfileBanner from "@/components/panel/StaffProfileBanner";
import { panelSegmentFromPathname } from "@/lib/panelAccess";
import { usePageTelemetry } from "@/hooks/usePageTelemetry";
import PanelPageErrorBoundary from "@/components/panel/PanelPageErrorBoundary";
import StaffPushPromptHost from "@/components/staff/StaffPushPromptHost";
import { useStaffT } from "@/hooks/useStaffT";

type Props = {
  page?: ComponentType<object>;
};

const PanelLayout = ({ page: Page }: Props) => {
  const { user, loading } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const { primaryLang } = useStoreLanguages(roleData?.store_id);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useStaffT();
  usePageTelemetry();

  useEffect(() => {
    if (!loading && !user) {
      navigate(nav.staff(), { replace: true });
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

  const panelSegment = panelSegmentFromPathname(location.pathname);
  const isLiveOps = panelSegment === "" || panelSegment === "live" || panelSegment === "kitchen";
  const headerTitle = isLiveOps ? t("layout.header.live") : t("layout.header.panel");

  return (
    <SelectedTenantProvider>
      <PanelStoreProvider>
        <StaffScreenHelpProvider>
        <SidebarProvider defaultOpen={false}>
          <div className="flex h-[100dvh] min-h-0 w-full max-w-full overflow-x-hidden">
            <PanelSidebar />
            <div className="flex min-h-0 flex-1 flex-col min-w-0">
              <header className="sticky top-0 z-30 h-14 flex items-center border-b px-3 sm:px-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 gap-2">
                <SidebarTrigger className="mr-1 sm:mr-2 shrink-0" />
                <h1 className="text-base sm:text-lg font-bold text-foreground truncate flex-1 min-w-0">{headerTitle}</h1>
                {isLiveOps ? <PanelOldPendingToolbarButton /> : null}
                <StaffTopBarAlerts area="panel" />
                <AdminMasterPanelBack />
                <PanelStoreSwitcher />
                <StaffLanguageToggle defaultLang={primaryLang === "fr" ? "es" : primaryLang} compact />
                <PanelUpdateButton />
                <AdminThemeToggle />
              </header>
              <main className="flex-1 min-h-0 p-4 sm:p-6 bg-secondary/50 overflow-x-hidden overflow-y-auto">
                <StaffProfileBanner />
                <PanelAccessGuard>
                  <PanelPageErrorBoundary>{Page ? <Page /> : <Outlet />}</PanelPageErrorBoundary>
                </PanelAccessGuard>
              </main>
            </div>
            {(roleData?.role === "admin_master" ||
              roleData?.role === "restaurant_admin" ||
              roleData?.role === "manager") && <AdminAssistant />}
          </div>
          <StaffPushPromptHost />
        </SidebarProvider>
        </StaffScreenHelpProvider>
      </PanelStoreProvider>
    </SelectedTenantProvider>
  );
};

export default PanelLayout;
