import { useRoutes } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout.tsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.tsx";
import TenantsPage from "@/pages/admin/TenantsPage.tsx";
import BillingPage from "@/pages/admin/BillingPage.tsx";
import MonitoringPage from "@/pages/admin/MonitoringPage.tsx";
import BrandingPage from "@/pages/admin/BrandingPage.tsx";
import BannerPage from "@/pages/admin/BannerPage.tsx";
import OperationsPage from "@/pages/admin/OperationsPage.tsx";
import PrinterPage from "@/pages/admin/PrinterPage.tsx";
import UsersPage from "@/pages/admin/UsersPage.tsx";
import AdminSettingsPage from "@/pages/admin/SettingsPage.tsx";
import GuidePage from "@/pages/admin/GuidePage.tsx";
import AiConversationsPage from "@/pages/admin/AiConversationsPage.tsx";
import AdminDomainsPage from "@/pages/admin/AdminDomainsPage.tsx";
import AdminPlansPage from "@/pages/admin/AdminPlansPage.tsx";
import AdminCentralsHubPage from "@/pages/admin/AdminCentralsHubPage.tsx";
import AdminCentralAiPage from "@/pages/admin/AdminCentralAiPage.tsx";
import AdminCentralLoyaltyPage from "@/pages/admin/AdminCentralLoyaltyPage.tsx";
import AdminCentralCampaignsPage from "@/pages/admin/AdminCentralCampaignsPage.tsx";
import AdminCentralPushPage from "@/pages/admin/AdminCentralPushPage.tsx";
import AdminCentralConversationalPage from "@/pages/admin/AdminCentralConversationalPage.tsx";
import AdminTenantCentralsHubPage from "@/pages/admin/AdminTenantCentralsHubPage.tsx";

const adminRouteTree = [
  {
    path: "/",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "tenants", element: <TenantsPage /> },
      { path: "domains", element: <AdminDomainsPage /> },
      { path: "plans", element: <AdminPlansPage /> },
      { path: "centrals", element: <AdminCentralsHubPage /> },
      { path: "centrals/ai", element: <AdminCentralAiPage /> },
      { path: "centrals/loyalty", element: <AdminCentralLoyaltyPage /> },
      { path: "centrals/campaigns", element: <AdminCentralCampaignsPage /> },
      { path: "centrals/push", element: <AdminCentralPushPage /> },
      { path: "centrals/conversational", element: <AdminCentralConversationalPage /> },
      { path: "tenants/:slug/centrals", element: <AdminTenantCentralsHubPage /> },
      { path: "tenants/:slug/centrals/ai", element: <AdminCentralAiPage /> },
      { path: "tenants/:slug/centrals/loyalty", element: <AdminCentralLoyaltyPage /> },
      { path: "tenants/:slug/centrals/campaigns", element: <AdminCentralCampaignsPage /> },
      { path: "tenants/:slug/centrals/push", element: <AdminCentralPushPage /> },
      { path: "tenants/:slug/centrals/conversational", element: <AdminCentralConversationalPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "monitoring", element: <MonitoringPage /> },
      { path: "branding", element: <BrandingPage /> },
      { path: "banner", element: <BannerPage /> },
      { path: "operations", element: <OperationsPage /> },
      { path: "printer", element: <PrinterPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "guide", element: <GuidePage /> },
      { path: "conversations", element: <AiConversationsPage /> },
    ],
  },
];

export default function AdminRoutes() {
  return useRoutes(adminRouteTree);
}
