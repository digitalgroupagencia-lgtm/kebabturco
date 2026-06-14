import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { startAndroidPrintListener } from "@/services/androidPrintListener";
import { enableTabletKeepAwake } from "@/services/tabletKeepAwake";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppCacheBustRouter from "@/components/AppCacheBustRouter.tsx";
import AppChromeEffect from "@/components/AppChromeEffect.tsx";
import ScreenOrientationEffect from "@/components/ScreenOrientationEffect.tsx";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PreviewPathGuard from "@/components/PreviewPathGuard.tsx";
import LovablePreviewGate from "@/components/LovablePreviewGate.tsx";
import { BrandingProvider } from "./contexts/BrandingContext.tsx";
import { OperationsSettingsProvider } from "./hooks/useOperationsSettings.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ResolvedStoreProvider } from "./hooks/useResolvedStore.tsx";
import { SiteBrandingEffect } from "./hooks/useSiteBranding.tsx";
import { SeoDocumentEffect } from "./hooks/useSeoDocument.tsx";
import StaffGoogleLoginRegistrar from "@/components/staff/StaffGoogleLoginRegistrar.tsx";
import TotemErrorBoundary from "@/components/TotemErrorBoundary";
import CustomerAreaBoundary from "@/customer/components/CustomerAreaBoundary.tsx";
import AdminErrorBoundary from "@/components/AdminErrorBoundary.tsx";
import { CatchAllResolver } from "@/routes/internalRouteOutlet.tsx";
import { Auth, Index, NotFound, StaffLogin } from "@/routes/appRouteRegistry.ts";
import StaffSessionRootRedirect from "@/components/StaffSessionRootRedirect.tsx";

const OnboardLinkPage = lazy(() => import("@/views/public/OnboardLinkPage.tsx"));

export { LOVABLE_PREVIEW_PATHS } from "@/lib/navPaths.ts";

const queryClient = new QueryClient();

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

// Cliente — qualquer crash em providers/módulos internos é contido aqui
const tenantStore = (
  <CustomerAreaBoundary>
    {withSuspense(
      <StaffSessionRootRedirect>
        <MobileFrame>
          <Index />
        </MobileFrame>
      </StaffSessionRootRedirect>,
    )}
  </CustomerAreaBoundary>
);


// Interno — falhas em admin/painel/equipa/etc. não escapam deste boundary
const internal = (
  <AdminErrorBoundary area="admin">
    {withSuspense(<CatchAllResolver notFound={<NotFound />} />)}
  </AdminErrorBoundary>
);

/**
 * Rotas do dropdown Lovable — APENAS 2 entradas literais + catch-all.
 * O scanner do preview lê App.tsx directamente: não adicionar /panel, /admin, etc.
 * Painel, admin, entregador e vendedor funcionam via CatchAllResolver + nav interno.
 */
const LovablePreviewRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route
      path="/staff"
      element={withSuspense(
        <MobileFrame>
          <StaffLogin />
        </MobileFrame>,
      )}
    />
    <Route
      path="/recibos/registro-datos/:token"
      element={withSuspense(<OnboardLinkPage />)}
    />
    <Route
      path="/ligar-conta/:token"
      element={withSuspense(<OnboardLinkPage />)}
    />
    <Route path="*" element={internal} />
  </Routes>
);

const App = () => {
  useEffect(() => {
    // No-op em web/PWA. Só ativa quando rodando dentro do APK Android (Capacitor).
    void startAndroidPrintListener();
    void enableTabletKeepAwake();
  }, []);

  return (
    <TotemErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ThemeProvider>
            <BrowserRouter>
              <AppChromeEffect />
              <ScreenOrientationEffect />
              <AppCacheBustRouter>
                <LovablePreviewGate />
                <PreviewPathGuard />
                <ResolvedStoreProvider>
                  <SiteBrandingEffect />
                  <SeoDocumentEffect />
                  <StaffGoogleLoginRegistrar />
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
};

export default App;
