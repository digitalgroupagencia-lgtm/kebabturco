import { Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { adminPage, panelPage, sellerPage } from "@/routes/layoutPage.tsx";
import {
  AdminDashboard,
  AdminPlansPage,
  AdminRoutesMapPage,
  Auth,
  BrandingPage,
  CashierPage,
  Index,
  MenuPage,
  NotFound,
  OperationsPage,
  OrdersPage,
  SellerHome,
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

/**
 * Rotas do dropdown Lovable — manter `<Route path="...">` literais NESTE ficheiro.
 * Não mover para outro módulo: o scanner do preview lê App.tsx directamente.
 */
const LovablePreviewRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/cashier" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />

    <Route path="/panel" element={withSuspense(panelPage(OrdersPage))} />
    <Route path="/panel/cashier" element={withSuspense(panelPage(CashierPage))} />

    <Route path="/admin" element={withSuspense(adminPage(AdminDashboard))} />
    <Route path="/admin/menu" element={withSuspense(adminPage(MenuPage))} />
    <Route path="/admin/branding" element={withSuspense(adminPage(BrandingPage))} />
    <Route path="/admin/operations" element={withSuspense(adminPage(OperationsPage))} />
    <Route path="/admin/routes" element={withSuspense(adminPage(AdminRoutesMapPage))} />
    <Route path="/admin/plans" element={withSuspense(adminPage(AdminPlansPage))} />

    <Route path="/seller" element={withSuspense(sellerPage(SellerHome))} />

    <Route path="*" element={withSuspense(<CatchAllResolver notFound={<NotFound />} />)} />
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
