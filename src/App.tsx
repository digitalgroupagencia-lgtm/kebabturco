import { Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppCacheBustRouter from "@/components/AppCacheBustRouter.tsx";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PreviewPathGuard from "@/components/PreviewPathGuard.tsx";
import { BrandingProvider } from "./contexts/BrandingContext.tsx";
import { OperationsSettingsProvider } from "./hooks/useOperationsSettings.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ResolvedStoreProvider } from "./hooks/useResolvedStore.tsx";
import { SiteBrandingEffect } from "./hooks/useSiteBranding.tsx";
import TotemErrorBoundary from "@/components/TotemErrorBoundary";
import { CatchAllResolver } from "@/routes/internalRouteOutlet.tsx";
import { panelPage } from "@/routes/layoutPage.tsx";
import {
  Auth,
  Index,
  NotFound,
  OrdersPage,
} from "@/routes/appRouteRegistry.ts";

export { LOVABLE_PREVIEW_PATHS } from "@/lib/navPaths.ts";

const queryClient = new QueryClient();

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const tenantStore = withSuspense(
  <MobileFrame>
    <Index />
  </MobileFrame>,
);

const internal = withSuspense(<CatchAllResolver notFound={<NotFound />} />);

/**
 * Rotas do dropdown Lovable — manter `<Route path="...">` literais NESTE ficheiro.
 * Não mover para outro módulo: o scanner do preview lê App.tsx directamente.
 * Todas as rotas internas (panel/*, admin/*, seller, cashier) delegam ao
 * CatchAllResolver, que faz o despacho via resolveRoute(pathname).
 */
const LovablePreviewRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/menu" element={internal} />
    <Route path="/cardapio" element={internal} />
    <Route path="/checkout" element={internal} />
    <Route path="/pagamento" element={internal} />
    <Route path="/confirmacao" element={internal} />
    <Route path="/pedido-concluido" element={internal} />
    <Route path="/confirmation" element={internal} />
    <Route path="/acompanhar" element={internal} />
    <Route path="/acompanhar-pedido" element={internal} />
    <Route path="/tracking" element={internal} />
    <Route path="/meus-pedidos" element={internal} />
    <Route path="/pedidos" element={internal} />
    <Route path="/mesa" element={internal} />
    <Route path="/qr" element={internal} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/panel" element={internal} />
    <Route path="/panel/menu" element={internal} />
    <Route path="/panel/cashier" element={internal} />
    <Route path="/panel/finance" element={internal} />
    <Route path="/panel/settings" element={internal} />
    <Route path="/panel/orders" element={internal} />
    <Route path="/panel/qrcodes" element={internal} />
    <Route path="/panel/tables" element={internal} />
    <Route path="/panel/modifiers" element={internal} />
    <Route path="/panel/branding" element={internal} />
    <Route path="/panel/banners" element={internal} />
    <Route path="/panel/delivery-zones" element={internal} />
    <Route path="/panel/payments" element={internal} />
    <Route path="/admin/panel" element={internal} />
    <Route path="/admin/orders" element={internal} />
    <Route path="/admin/finance" element={internal} />
    <Route path="/admin/settings" element={internal} />
    <Route path="/admin/menu" element={internal} />
    <Route path="/admin/qrcodes" element={internal} />
    <Route path="/admin" element={internal} />
    <Route path="/admin/routes" element={internal} />
    <Route path="/admin/plans" element={internal} />
    <Route path="/cashier" element={internal} />
    <Route path="/seller" element={internal} />
    <Route path="*" element={internal} />
  </Routes>
);

const App = () => (
  <TotemErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <BrowserRouter>
            <AppCacheBustRouter>
              <PreviewPathGuard />
              <ResolvedStoreProvider>
                <SiteBrandingEffect />
                <BrandingProvider>
                  <OperationsSettingsProvider>
                    <LovablePreviewRoutes />
                  </OperationsSettingsProvider>
                </BrandingProvider>
              </ResolvedStoreProvider>
            </AppCacheBustRouter>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </TotemErrorBoundary>
);

export default App;
