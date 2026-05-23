import { useRoutes } from "react-router-dom";
import TenantPanelLayout from "@/components/admin/TenantPanelLayout.tsx";
import TenantWorkspaceOverviewPage from "@/pages/admin/tenant/TenantWorkspaceOverviewPage.tsx";
import Dashboard from "@/pages/panel/Dashboard.tsx";
import MenuPage from "@/pages/panel/MenuPage.tsx";
import OrdersPage from "@/pages/panel/OrdersPage.tsx";
import CashierPage from "@/pages/panel/CashierPage.tsx";
import StockPage from "@/pages/panel/StockPage.tsx";
import ReportsPage from "@/pages/panel/ReportsPage.tsx";
import TeamPage from "@/pages/panel/TeamPage.tsx";
import TotemConfigPage from "@/pages/panel/TotemConfigPage.tsx";
import TablesPage from "@/pages/panel/TablesPage.tsx";
import TableMapPage from "@/pages/panel/TableMapPage.tsx";
import PanelSettingsPage from "@/pages/panel/SettingsPage.tsx";
import BrandingPage from "@/pages/admin/BrandingPage.tsx";
import BannerPage from "@/pages/admin/BannerPage.tsx";
import OperationsPage from "@/pages/admin/OperationsPage.tsx";
import FinancePage from "@/pages/panel/FinancePage.tsx";
import PrinterPage from "@/pages/admin/PrinterPage.tsx";
import TenantDuplicatePage from "@/pages/admin/tenant/TenantDuplicatePage.tsx";
import TenantLinksPage from "@/pages/admin/tenant/TenantLinksPage.tsx";
import TenantLanguagesPage from "@/pages/admin/tenant/TenantLanguagesPage.tsx";
import TenantStoresPage from "@/pages/admin/tenant/TenantStoresPage.tsx";
import TenantDeliveryZonesPage from "@/pages/admin/tenant/TenantDeliveryZonesPage.tsx";
import TenantScreensPage from "@/pages/admin/tenant/TenantScreensPage.tsx";

const tenantRouteTree = [
  {
    path: "/",
    element: <TenantPanelLayout />,
    children: [
      { index: true, element: <TenantWorkspaceOverviewPage /> },
      { path: "painel", element: <OrdersPage /> },
      { path: "painel/dashboard", element: <Dashboard /> },
      { path: "menu", element: <MenuPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "table-map", element: <TableMapPage /> },
      { path: "cashier", element: <CashierPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "totem", element: <TotemConfigPage /> },
      { path: "tables", element: <TablesPage /> },
      { path: "branding", element: <BrandingPage /> },
      { path: "banners", element: <BannerPage /> },
      { path: "payments", element: <OperationsPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "printer", element: <PrinterPage /> },
      { path: "settings", element: <PanelSettingsPage /> },
      { path: "duplicate", element: <TenantDuplicatePage /> },
      { path: "links", element: <TenantLinksPage /> },
      { path: "languages", element: <TenantLanguagesPage /> },
      { path: "stores", element: <TenantStoresPage /> },
      { path: "delivery-zones", element: <TenantDeliveryZonesPage /> },
      { path: "screens", element: <TenantScreensPage /> },
    ],
  },
];

export default function TenantWorkspaceRoutes() {
  return useRoutes(tenantRouteTree);
}
