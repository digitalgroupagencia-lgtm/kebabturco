import { Navigate, Route } from "react-router-dom";
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

/** Filhos de `<Route path="/panel">` — sem wildcard no AppRoutes. */
export const panelRouteElements = (
  <>
    <Route index element={<OrdersPage />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="menu" element={<MenuPage />} />
    <Route path="modifiers" element={<ModifierGroupsPage />} />
    <Route path="orders" element={<OrdersPage />} />
    <Route path="table-map" element={<TableMapPage />} />
    <Route path="cashier" element={<CashierPage />} />
    <Route path="stock" element={<StockPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="team" element={<TeamPage />} />
    <Route path="sellers" element={<SellersPage />} />
    <Route path="totem" element={<TotemConfigPage />} />
    <Route path="tables" element={<TablesPage />} />
    <Route path="printers" element={<PrinterPage />} />
    <Route path="settings" element={<PanelSettingsPage />} />
    <Route path="diagnostics" element={<DiagnosticsPage />} />
    <Route path="branding" element={<BrandingPage />} />
    <Route path="banners" element={<BannerPage />} />
    <Route path="stores" element={<TenantStoresPage />} />
    <Route path="screens" element={<TenantScreensPage />} />
    <Route path="languages" element={<TenantLanguagesPage />} />
    <Route path="delivery-zones" element={<TenantDeliveryZonesPage />} />
    <Route path="payments" element={<OperationsPage />} />
    <Route path="finance" element={<FinancePage />} />
    <Route path="guide" element={<PanelGuidePage />} />
    <Route path="coupons" element={<CouponsPage />} />
    <Route path="loyalty" element={<LoyaltyPage />} />
    <Route path="*" element={<Navigate to="/panel" replace />} />
  </>
);
