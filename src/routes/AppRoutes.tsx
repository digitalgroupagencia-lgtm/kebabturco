import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { isDefaultKebabContextHost } from "@/lib/platformHosts";
import { isReservedAppPath } from "@/lib/appPaths";

const Index = lazy(() => import("@/pages/Index.tsx"));
const Auth = lazy(() => import("@/pages/Auth.tsx"));
const Install = lazy(() => import("@/pages/Install.tsx"));
const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

const PanelRoutes = lazy(() => import("@/routes/panelRoutes.tsx"));
const SellerRoutes = lazy(() => import("@/routes/sellerRoutes.tsx"));
const AdminRoutes = lazy(() => import("@/routes/adminRoutes.tsx"));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const tenantStore = withSuspense(
  <MobileFrame>
    <Index />
  </MobileFrame>,
);

/** /kebab-turco ou slug similar no preview — abre a loja. */
function TenantSlugStore() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  if (!tenantSlug || isReservedAppPath(tenantSlug)) {
    return withSuspense(<Navigate to="/" replace />);
  }
  if (!isDefaultKebabContextHost(window.location.hostname)) {
    return withSuspense(<Navigate to="/" replace />);
  }
  return tenantStore;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/install" element={withSuspense(<Install />)} />
    <Route path="/panel/*" element={withSuspense(<PanelRoutes />)} />
    <Route path="/seller/*" element={withSuspense(<SellerRoutes />)} />
    <Route path="/admin/*" element={withSuspense(<AdminRoutes />)} />
    <Route path="/cashier" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />
    <Route path="/cashier/*" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />
    <Route path="/preview/:tenantSlug/panel/*" element={withSuspense(<PanelRoutes />)} />
    <Route path="/preview/:tenantSlug" element={tenantStore} />
    <Route path="/:tenantSlug" element={<TenantSlugStore />} />
    <Route path="*" element={withSuspense(<NotFound />)} />
  </Routes>
);

export default AppRoutes;
