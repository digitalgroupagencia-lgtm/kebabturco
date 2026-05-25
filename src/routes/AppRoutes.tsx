import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";

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

/** Kebab Turco — rotas simples: loja, painel, auth, admin. */
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
    {/* Legado multi-tenant — redireccionar para não confundir */}
    <Route path="/admin/tenants/*" element={withSuspense(<Navigate to="/admin" replace />)} />
    <Route path="/preview/:tenantSlug/panel/*" element={withSuspense(<PanelRoutes />)} />
    <Route path="/preview/:tenantSlug" element={tenantStore} />
    <Route path="*" element={withSuspense(<NotFound />)} />
  </Routes>
);

export default AppRoutes;
