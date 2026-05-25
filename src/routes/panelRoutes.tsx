import { useRoutes } from "react-router-dom";
import PanelLayout from "@/components/panel/PanelLayout.tsx";
import Dashboard from "@/pages/panel/Dashboard.tsx";
import MenuPage from "@/pages/panel/MenuPage.tsx";
import ModifierGroupsPage from "@/pages/panel/ModifierGroupsPage.tsx";
import OrdersPage from "@/pages/panel/OrdersPage.tsx";
import CashierPage from "@/pages/panel/CashierPage.tsx";
import StockPage from "@/pages/panel/StockPage.tsx";
import ReportsPage from "@/pages/panel/ReportsPage.tsx";
import TeamPage from "@/pages/panel/TeamPage.tsx";
import TotemConfigPage from "@/pages/panel/TotemConfigPage.tsx";
import PanelSettingsPage from "@/pages/panel/SettingsPage.tsx";
import SellersPage from "@/pages/panel/SellersPage.tsx";
import TablesPage from "@/pages/panel/TablesPage.tsx";
import TableMapPage from "@/pages/panel/TableMapPage.tsx";
import PanelGuidePage from "@/pages/panel/GuidePage.tsx";
import CouponsPage from "@/pages/panel/CouponsPage.tsx";
import LoyaltyPage from "@/pages/panel/LoyaltyPage.tsx";
import FinancePage from "@/pages/panel/FinancePage.tsx";
import DiagnosticsPage from "@/pages/panel/DiagnosticsPage.tsx";
import BrandingPage from "@/pages/admin/BrandingPage.tsx";
import BannerPage from "@/pages/admin/BannerPage.tsx";
import OperationsPage from "@/pages/admin/OperationsPage.tsx";
import PrinterPage from "@/pages/admin/PrinterPage.tsx";
import TenantStoresPage from "@/pages/admin/tenant/TenantStoresPage.tsx";
import TenantDeliveryZonesPage from "@/pages/admin/tenant/TenantDeliveryZonesPage.tsx";
import TenantScreensPage from "@/pages/admin/tenant/TenantScreensPage.tsx";
import TenantLanguagesPage from "@/pages/admin/tenant/TenantLanguagesPage.tsx";

const panelRouteTree = [
  {
    path: "/",
    element: <PanelLayout />,
    children: [
      { index: true, element: <OrdersPage /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "menu", element: <MenuPage /> },
      { path: "modifiers", element: <ModifierGroupsPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "table-map", element: <TableMapPage /> },
      { path: "cashier", element: <CashierPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "sellers", element: <SellersPage /> },
      { path: "totem", element: <TotemConfigPage /> },
      { path: "tables", element: <TablesPage /> },
      { path: "printers", element: <PrinterPage /> },
      { path: "settings", element: <PanelSettingsPage /> },
      { path: "diagnostics", element: <DiagnosticsPage /> },
      { path: "branding", element: <BrandingPage /> },
      { path: "banners", element: <BannerPage /> },
      { path: "stores", element: <TenantStoresPage /> },
      { path: "screens", element: <TenantScreensPage /> },
      { path: "languages", element: <TenantLanguagesPage /> },
      { path: "delivery-zones", element: <TenantDeliveryZonesPage /> },
      { path: "payments", element: <OperationsPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "guide", element: <PanelGuidePage /> },
      { path: "coupons", element: <CouponsPage /> },
      { path: "loyalty", element: <LoyaltyPage /> },
    ],
  },
];

export default function PanelRoutes() {
  return useRoutes(panelRouteTree);
}
