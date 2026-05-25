import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MobileFrame from "@/components/MobileFrame.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import { isAdminMasterHost } from "@/lib/platformHosts";

const Index = lazy(() => import("@/pages/Index.tsx"));
const Auth = lazy(() => import("@/pages/Auth.tsx"));
const Install = lazy(() => import("@/pages/Install.tsx"));
const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

const PanelRoutes = lazy(() => import("@/routes/panelRoutes.tsx"));
const SellerRoutes = lazy(() => import("@/routes/sellerRoutes.tsx"));
const AdminRoutes = lazy(() => import("@/routes/adminRoutes.tsx"));
const TenantWorkspaceRoutes = lazy(() => import("@/routes/tenantWorkspaceRoutes.tsx"));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const platformRedirect = withSuspense(<Navigate to="/admin" replace />);

/** snaporder.* = plataforma; kebabturco.net e outros custom_domain = restaurante (white-label). */
const isPlatform = isAdminMasterHost(window.location.hostname);

const AppRoutes = () => (
  <Routes>
    {isPlatform ? (
      <>
        <Route path="/" element={platformRedirect} />
        <Route path="/auth" element={withSuspense(<Auth />)} />
        <Route path="/install" element={withSuspense(<Install />)} />
        <Route path="/admin/tenants/:slug/*" element={withSuspense(<TenantWorkspaceRoutes />)} />
        <Route path="/admin/*" element={withSuspense(<AdminRoutes />)} />
        <Route path="/panel/*" element={platformRedirect} />
        <Route path="/seller/*" element={platformRedirect} />
        <Route path="/:tenantPath/*" element={platformRedirect} />
        <Route path="*" element={platformRedirect} />
      </>
    ) : (
      <>
        <Route path="/" element={withSuspense(<MobileFrame><Index /></MobileFrame>)} />
        <Route path="/:tenantPath" element={withSuspense(<MobileFrame><Index /></MobileFrame>)} />
        <Route path="/auth" element={withSuspense(<Auth />)} />
        <Route path="/install" element={withSuspense(<Install />)} />
        <Route path="/panel/*" element={withSuspense(<PanelRoutes />)} />
        <Route path="/seller/*" element={withSuspense(<SellerRoutes />)} />
        <Route path="/admin/tenants/:slug/*" element={withSuspense(<TenantWorkspaceRoutes />)} />
        <Route path="/admin/*" element={withSuspense(<AdminRoutes />)} />
        <Route path="*" element={withSuspense(<NotFound />)} />
      </>
    )}
  </Routes>
);

export default AppRoutes;
