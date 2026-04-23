import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
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
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import TenantsPage from "./pages/admin/TenantsPage.tsx";
import BillingPage from "./pages/admin/BillingPage.tsx";
import MonitoringPage from "./pages/admin/MonitoringPage.tsx";
import BrandingPage from "./pages/admin/BrandingPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { BrandingProvider } from "./contexts/BrandingContext.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrandingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="cashier" element={<CashierPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="totem" element={<TotemConfigPage />} />
            <Route path="printers" element={<PlaceholderPage title="Impressoras" />} />
            <Route path="settings" element={<PlaceholderPage title="Configurações" />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="users" element={<PlaceholderPage title="Usuários do Sistema" />} />
            <Route path="settings" element={<PlaceholderPage title="Configurações Globais" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </BrandingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
