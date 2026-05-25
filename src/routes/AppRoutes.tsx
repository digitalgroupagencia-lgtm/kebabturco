/**
 * Rotas do preview Lovable — único ficheiro com `<Route path="...">` literais.
 * Rotas internas (/panel/stock, /admin/users, …) resolvem via CatchAllResolver.
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { LOVABLE_PREVIEW_PATHS, nav } from "@/lib/navPaths.ts";
import { CatchAllResolver } from "@/routes/internalRouteOutlet.tsx";

export { LOVABLE_PREVIEW_PATHS };

const Index = lazy(() => import("@/pages/Index.tsx"));
const Auth = lazy(() => import("@/pages/Auth.tsx"));
const Install = lazy(() => import("@/pages/Install.tsx"));
const NotFound = lazy(() => import("@/pages/NotFound.tsx"));
const PanelLayout = lazy(() => import("@/components/panel/PanelLayout.tsx"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout.tsx"));
const SellerLayout = lazy(() => import("@/components/seller/SellerLayout.tsx"));
const OrdersPage = lazy(() => import("@/views/panel/OrdersPage.tsx"));
const MenuPage = lazy(() => import("@/views/panel/MenuPage.tsx"));
const CashierPage = lazy(() => import("@/views/panel/CashierPage.tsx"));
const AdminDashboard = lazy(() => import("@/views/admin/AdminDashboard.tsx"));
const AdminRoutesMapPage = lazy(() => import("@/views/admin/AdminRoutesMapPage.tsx"));
const AdminPlansPage = lazy(() => import("@/views/admin/AdminPlansPage.tsx"));
const SellerHome = lazy(() => import("@/views/seller/SellerHome.tsx"));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const tenantStore = withSuspense(
  <MobileFrame>
    <Index />
  </MobileFrame>,
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/install" element={withSuspense(<Install />)} />
    <Route
      path="/cashier"
      element={withSuspense(<Navigate to={nav.panel("cashier")} replace />)}
    />

    <Route element={withSuspense(<PanelLayout />)}>
      <Route path="/panel" element={withSuspense(<OrdersPage />)} />
      <Route path="/panel/menu" element={withSuspense(<MenuPage />)} />
      <Route path="/panel/cashier" element={withSuspense(<CashierPage />)} />
    </Route>

    <Route element={withSuspense(<AdminLayout />)}>
      <Route path="/admin" element={withSuspense(<AdminDashboard />)} />
      <Route path="/admin/routes" element={withSuspense(<AdminRoutesMapPage />)} />
      <Route path="/admin/plans" element={withSuspense(<AdminPlansPage />)} />
    </Route>

    <Route element={withSuspense(<SellerLayout />)}>
      <Route path="/seller" element={withSuspense(<SellerHome />)} />
    </Route>

    <Route path="*" element={withSuspense(<CatchAllResolver notFound={<NotFound />} />)} />
  </Routes>
);

export default AppRoutes;
