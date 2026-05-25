/**
 * Lista curada para o selector de páginas do preview Lovable.
 * Única fonte de `<Route path="...">` no projecto — não duplicar noutros ficheiros.
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { ADMIN_ROUTE_LOADERS } from "@/routes/adminRouteConfig.ts";
import { buildLayoutRoutes } from "@/routes/buildLayoutRoutes.tsx";
import { PANEL_ROUTE_LOADERS } from "@/routes/panelRouteConfig.ts";
import { SELLER_ROUTE_LOADERS } from "@/routes/sellerRouteConfig.ts";

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

/** Endereços que o preview Lovable deve listar (referência explícita). */
export const LOVABLE_PREVIEW_PATHS = [
  "/",
  "/auth",
  "/install",
  "/cashier",
  "/panel",
  "/panel/menu",
  "/panel/cashier",
  "/admin",
  "/admin/routes",
  "/admin/plans",
] as const;

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={tenantStore} />
    <Route path="/auth" element={withSuspense(<Auth />)} />
    <Route path="/install" element={withSuspense(<Install />)} />
    <Route path="/cashier" element={withSuspense(<Navigate to="/panel/cashier" replace />)} />

    {buildLayoutRoutes(PanelLayout, PANEL_ROUTE_LOADERS)}
    {buildLayoutRoutes(AdminLayout, ADMIN_ROUTE_LOADERS)}
    {buildLayoutRoutes(SellerLayout, SELLER_ROUTE_LOADERS)}

    <Route path="*" element={withSuspense(<NotFound />)} />
  </Routes>
);

export default AppRoutes;
