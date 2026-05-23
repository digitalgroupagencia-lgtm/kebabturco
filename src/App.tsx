import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppCacheBustRouter from "@/components/AppCacheBustRouter.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import MobileFrame from "./components/MobileFrame.tsx";
import PanelLayout from "./components/panel/PanelLayout.tsx";
import Dashboard from "./pages/panel/Dashboard.tsx";
import MenuPage from "./pages/panel/MenuPage.tsx";
import OrdersPage from "./pages/panel/OrdersPage.tsx";
import CashierPage from "./pages/panel/CashierPage.tsx";
import StockPage from "./pages/panel/StockPage.tsx";
import ReportsPage from "./pages/panel/ReportsPage.tsx";
import TeamPage from "./pages/panel/TeamPage.tsx";
import TotemConfigPage from "./pages/panel/TotemConfigPage.tsx";
import PlaceholderPage from "./pages/panel/PlaceholderPage.tsx";
import PanelSettingsPage from "./pages/panel/SettingsPage.tsx";
import SellersPage from "./pages/panel/SellersPage.tsx";
import TablesPage from "./pages/panel/TablesPage.tsx";
import TableMapPage from "./pages/panel/TableMapPage.tsx";
import PanelGuidePage from "./pages/panel/GuidePage.tsx";
import CouponsPage from "./pages/panel/CouponsPage.tsx";
import LoyaltyPage from "./pages/panel/LoyaltyPage.tsx";
import FinancePage from "./pages/panel/FinancePage.tsx";
import SellerLayout from "./components/seller/SellerLayout.tsx";
import SellerHome from "./pages/seller/SellerHome.tsx";
import SellerTables from "./pages/seller/SellerTables.tsx";
import SellerMyOrders from "./pages/seller/SellerMyOrders.tsx";
import SellerNewOrder from "./pages/seller/SellerNewOrder.tsx";
import SellerTableDetail from "./pages/seller/SellerTableDetail.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import TenantsPage from "./pages/admin/TenantsPage.tsx";
import BillingPage from "./pages/admin/BillingPage.tsx";
import MonitoringPage from "./pages/admin/MonitoringPage.tsx";
import BrandingPage from "./pages/admin/BrandingPage.tsx";
import BannerPage from "./pages/admin/BannerPage.tsx";
import OperationsPage from "./pages/admin/OperationsPage.tsx";
import PrinterPage from "./pages/admin/PrinterPage.tsx";
import UsersPage from "./pages/admin/UsersPage.tsx";
import AdminSettingsPage from "./pages/admin/SettingsPage.tsx";
import GuidePage from "./pages/admin/GuidePage.tsx";
import AiConversationsPage from "./pages/admin/AiConversationsPage.tsx";
import TenantPanelLayout from "./components/admin/TenantPanelLayout.tsx";
import TenantDuplicatePage from "./pages/admin/tenant/TenantDuplicatePage.tsx";
import TenantLinksPage from "./pages/admin/tenant/TenantLinksPage.tsx";
import TenantLanguagesPage from "./pages/admin/tenant/TenantLanguagesPage.tsx";
import TenantStoresPage from "./pages/admin/tenant/TenantStoresPage.tsx";
import TenantDeliveryZonesPage from "./pages/admin/tenant/TenantDeliveryZonesPage.tsx";
import TenantScreensPage from "./pages/admin/tenant/TenantScreensPage.tsx";
import AdminDomainsPage from "./pages/admin/AdminDomainsPage.tsx";
import AdminPlansPage from "./pages/admin/AdminPlansPage.tsx";
import AdminCentralsHubPage from "./pages/admin/AdminCentralsHubPage.tsx";
import AdminCentralAiPage from "./pages/admin/AdminCentralAiPage.tsx";
import AdminCentralLoyaltyPage from "./pages/admin/AdminCentralLoyaltyPage.tsx";
import AdminCentralCampaignsPage from "./pages/admin/AdminCentralCampaignsPage.tsx";
import AdminCentralPushPage from "./pages/admin/AdminCentralPushPage.tsx";
import AdminCentralConversationalPage from "./pages/admin/AdminCentralConversationalPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import PlatformHostGate from "./components/PlatformHostGate.tsx";
import Install from "./pages/Install.tsx";
import { BrandingProvider } from "./contexts/BrandingContext.tsx";
import { OperationsSettingsProvider } from "./hooks/useOperationsSettings.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ResolvedStoreProvider } from "./hooks/useResolvedStore.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
      <BrowserRouter>
      <AppCacheBustRouter>
      <PlatformHostGate />
      <ResolvedStoreProvider>
      <BrandingProvider>
      <OperationsSettingsProvider>
        <Routes>
          <Route path="/" element={<MobileFrame><Index /></MobileFrame>} />
          {/* Acesso via subpath do domínio mestre (ex.: dominio.com/kebabturco) */}
          <Route path="/:tenantPath" element={<MobileFrame><Index /></MobileFrame>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuPage />} />
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
          </Route>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<SellerHome />} />
            <Route path="tables" element={<SellerTables />} />
            <Route path="tables/:sessionId" element={<SellerTableDetail />} />
            <Route path="my-orders" element={<SellerMyOrders />} />
            <Route path="new" element={<SellerNewOrder />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="domains" element={<AdminDomainsPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="centrals" element={<AdminCentralsHubPage />} />
            <Route path="centrals/ai" element={<AdminCentralAiPage />} />
            <Route path="centrals/loyalty" element={<AdminCentralLoyaltyPage />} />
            <Route path="centrals/campaigns" element={<AdminCentralCampaignsPage />} />
            <Route path="centrals/push" element={<AdminCentralPushPage />} />
            <Route path="centrals/conversational" element={<AdminCentralConversationalPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="banner" element={<BannerPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="printer" element={<PrinterPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="conversations" element={<AiConversationsPage />} />
          </Route>
          <Route path="/admin/tenants/:slug" element={<TenantPanelLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="table-map" element={<TableMapPage />} />
            <Route path="cashier" element={<CashierPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="totem" element={<TotemConfigPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="banners" element={<BannerPage />} />
            <Route path="payments" element={<OperationsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="printer" element={<PrinterPage />} />
            <Route path="settings" element={<PanelSettingsPage />} />
            <Route path="duplicate" element={<TenantDuplicatePage />} />
            <Route path="links" element={<TenantLinksPage />} />
            <Route path="languages" element={<TenantLanguagesPage />} />
            <Route path="stores" element={<TenantStoresPage />} />
            <Route path="delivery-zones" element={<TenantDeliveryZonesPage />} />
            <Route path="screens" element={<TenantScreensPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </OperationsSettingsProvider>
      </BrandingProvider>
      </ResolvedStoreProvider>
      </AppCacheBustRouter>
      </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
