import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import AppCacheBustRouter from "@/components/AppCacheBustRouter.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppRoutes from "@/routes/AppRoutes.tsx";
import { BrandingProvider } from "./contexts/BrandingContext.tsx";
import { OperationsSettingsProvider } from "./hooks/useOperationsSettings.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ResolvedStoreProvider } from "./hooks/useResolvedStore.tsx";
import TotemErrorBoundary from "@/components/TotemErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <TotemErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <BrowserRouter>
            <AppCacheBustRouter>
              <ResolvedStoreProvider>
                <BrandingProvider>
                  <OperationsSettingsProvider>
                    <AppRoutes />
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
