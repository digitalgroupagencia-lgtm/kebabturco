import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { adminRouteElements } from "@/routes/adminRoutes.tsx";
import { panelRouteElements } from "@/routes/panelRoutes.tsx";
import { sellerRouteElements } from "@/routes/sellerRoutes.tsx";

const Index = lazy(() => import("@/pages/Index.tsx"));
const Auth = lazy(() => import("@/pages/Auth.tsx"));
const Install = lazy(() => import("@/pages/Install.tsx"));
const NotFound = lazy(() => import("@/pages/NotFound.tsx"));
const PanelLayout = lazy(() => import("@/components/panel/PanelLayout.tsx"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout.tsx"));
const SellerLayout = lazy(() => import("@/components/seller/SellerLayout.tsx"));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const tenantStore = withSuspense(
  <MobileFrame>
    <Index />
  </MobileFrame>,
);

const legacyPreviewSearch = `?preview=1&tenant=${DEFAULT_TENANT_SLUG}`;

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/install" element={withSuspense(<Install />)} />
    <Route path="/cashier" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />

    <Route path="/panel" element={withSuspense(<PanelLayout />)}>
      {panelRouteElements}
    </Route>

    <Route path="/admin" element={withSuspense(<AdminLayout />)}>
      {adminRouteElements}
    </Route>

    <Route path="/seller" element={withSuspense(<SellerLayout />)}>
      {sellerRouteElements}
    </Route>

    {/* Legado multi-tenant — redirects fixos (sem :param no scanner). */}
    <Route
      path="/preview/kebab-turco"
      element={withSuspense(<Navigate to={{ pathname: "/", search: legacyPreviewSearch }} replace />)}
    />
    <Route path="/kebab-turco" element={withSuspense(<Navigate to="/" replace />)} />

    <Route path="*" element={withSuspense(<NotFound />)} />
  </Routes>
);

export default AppRoutes;
