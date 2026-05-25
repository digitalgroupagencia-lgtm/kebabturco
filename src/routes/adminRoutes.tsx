import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout.tsx";
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

const redirect = <Navigate to="/admin" replace />;

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="tenants" element={redirect} />
        <Route path="tenants/*" element={redirect} />
        <Route path="domains" element={redirect} />
        <Route path="plans" element={redirect} />
        <Route path="billing" element={redirect} />
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
      </Route>
    </Routes>
  );
}
