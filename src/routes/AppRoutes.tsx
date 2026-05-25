/**
 * Rotas do preview Lovable — cada entrada do dropdown tem `<Route path="...">` literal aqui.
 * Outras páginas (estoque, centrais, mesas do vendedor, instalar app) resolvem via CatchAllResolver.
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { LOVABLE_PREVIEW_PATHS } from "@/lib/navPaths.ts";
import { adminPage, panelPage, sellerPage } from "@/routes/layoutPage.tsx";
import { CatchAllResolver } from "@/routes/internalRouteOutlet.tsx";

export { LOVABLE_PREVIEW_PATHS };

const Index = lazy(() => import("@/pages/Index.tsx"));
const Auth = lazy(() => import("@/pages/Auth.tsx"));
const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

const OrdersPage = lazy(() => import("@/views/panel/OrdersPage.tsx"));
const MenuPage = lazy(() => import("@/views/panel/MenuPage.tsx"));
const CashierPage = lazy(() => import("@/views/panel/CashierPage.tsx"));
const ModifierGroupsPage = lazy(() => import("@/views/panel/ModifierGroupsPage.tsx"));
const BrandingPage = lazy(() => import("@/views/admin/BrandingPage.tsx"));
const BannerPage = lazy(() => import("@/views/admin/BannerPage.tsx"));
const TenantDeliveryZonesPage = lazy(() => import("@/views/admin/tenant/TenantDeliveryZonesPage.tsx"));
const OperationsPage = lazy(() => import("@/views/admin/OperationsPage.tsx"));

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
    <Route path="/cashier" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />

    <Route path="/panel" element={withSuspense(panelPage(OrdersPage))} />
    <Route path="/panel/menu" element={withSuspense(panelPage(MenuPage))} />
    <Route path="/panel/cashier" element={withSuspense(panelPage(CashierPage))} />
    <Route path="/panel/modifiers" element={withSuspense(panelPage(ModifierGroupsPage))} />
    <Route path="/panel/branding" element={withSuspense(panelPage(BrandingPage))} />
    <Route path="/panel/banners" element={withSuspense(panelPage(BannerPage))} />
    <Route path="/panel/delivery-zones" element={withSuspense(panelPage(TenantDeliveryZonesPage))} />
    <Route path="/panel/payments" element={withSuspense(panelPage(OperationsPage))} />

    <Route path="/admin" element={withSuspense(adminPage(AdminDashboard))} />
    <Route path="/admin/routes" element={withSuspense(adminPage(AdminRoutesMapPage))} />
    <Route path="/admin/plans" element={withSuspense(adminPage(AdminPlansPage))} />

    <Route path="/seller" element={withSuspense(sellerPage(SellerHome))} />

    <Route path="*" element={withSuspense(<CatchAllResolver notFound={<NotFound />} />)} />
  </Routes>
);

export default AppRoutes;
