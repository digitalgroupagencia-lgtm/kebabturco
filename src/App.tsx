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
import TotemConfigPage from "./pages/panel/TotemConfigPage.tsx";
import PlaceholderPage from "./pages/panel/PlaceholderPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="cashier" element={<CashierPage />} />
            <Route path="totem" element={<TotemConfigPage />} />
            <Route path="stock" element={<PlaceholderPage title="Estoque" />} />
            <Route path="reports" element={<PlaceholderPage title="Relatórios" />} />
            <Route path="printers" element={<PlaceholderPage title="Impressoras" />} />
            <Route path="team" element={<PlaceholderPage title="Equipe" />} />
            <Route path="settings" element={<PlaceholderPage title="Configurações" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
