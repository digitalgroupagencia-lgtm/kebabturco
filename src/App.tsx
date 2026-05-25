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

/**
 * Rotas do dropdown Lovable — manter `<Route path="...">` literais NESTE ficheiro.
 * Não mover para outro módulo: o scanner do preview lê App.tsx directamente.
 */
const LovablePreviewRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/panel" element={withSuspense(panelPage(OrdersPage))} />
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
