import { Navigate, Route } from "react-router-dom";
import AdminDashboard from "@/pages/admin/AdminDashboard.tsx";
import MonitoringPage from "@/pages/admin/MonitoringPage.tsx";
import BrandingPage from "@/pages/admin/BrandingPage.tsx";
import BannerPage from "@/pages/admin/BannerPage.tsx";
import OperationsPage from "@/pages/admin/OperationsPage.tsx";
import PrinterPage from "@/pages/admin/PrinterPage.tsx";
import UsersPage from "@/pages/admin/UsersPage.tsx";
import AdminSettingsPage from "@/pages/admin/SettingsPage.tsx";
import GuidePage from "@/pages/admin/GuidePage.tsx";
import AiConversationsPage from "@/pages/admin/AiConversationsPage.tsx";
import AdminCentralsHubPage from "@/pages/admin/AdminCentralsHubPage.tsx";
import AdminCentralAiPage from "@/pages/admin/AdminCentralAiPage.tsx";
import AdminCentralLoyaltyPage from "@/pages/admin/AdminCentralLoyaltyPage.tsx";
import AdminCentralCampaignsPage from "@/pages/admin/AdminCentralCampaignsPage.tsx";
import AdminCentralPushPage from "@/pages/admin/AdminCentralPushPage.tsx";
import AdminCentralConversationalPage from "@/pages/admin/AdminCentralConversationalPage.tsx";
import AdminPlansPage from "@/pages/admin/AdminPlansPage.tsx";
import AdminRoutesMapPage from "@/pages/admin/AdminRoutesMapPage.tsx";

/** Filhos de `<Route path="/admin">` — sem wildcard no AppRoutes. */
export const adminRouteElements = (
  <>
    <Route index element={<AdminDashboard />} />
    <Route path="plans" element={<AdminPlansPage />} />
    <Route path="routes" element={<AdminRoutesMapPage />} />
    <Route path="centrals" element={<AdminCentralsHubPage />} />
    <Route path="centrals/ai" element={<AdminCentralAiPage />} />
    <Route path="centrals/loyalty" element={<AdminCentralLoyaltyPage />} />
    <Route path="centrals/campaigns" element={<AdminCentralCampaignsPage />} />
    <Route path="centrals/push" element={<AdminCentralPushPage />} />
    <Route path="centrals/conversational" element={<AdminCentralConversationalPage />} />
    <Route path="monitoring" element={<MonitoringPage />} />
    <Route path="branding" element={<BrandingPage />} />
    <Route path="banner" element={<BannerPage />} />
    <Route path="operations" element={<OperationsPage />} />
    <Route path="printer" element={<PrinterPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="settings" element={<AdminSettingsPage />} />
    <Route path="guide" element={<GuidePage />} />
    <Route path="conversations" element={<AiConversationsPage />} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </>
);
