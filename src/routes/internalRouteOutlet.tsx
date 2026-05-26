import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AdminErrorBoundary from "@/components/AdminErrorBoundary.tsx";
import PageSpinner from "@/components/PageSpinner.tsx";
import PanelLayout from "@/components/panel/PanelLayout.tsx";
import AdminLayout from "@/components/admin/AdminLayout.tsx";
import SellerLayout from "@/components/seller/SellerLayout.tsx";
import DeliveryLayout from "@/components/delivery/DeliveryLayout.tsx";
import { resolveRoute, type AppArea, type RouteSegmentDef } from "@/lib/navPaths.ts";
import { resolveAdminRestaurantPanelAlias, resolveCustomerRouteRedirect, resolveLegacyRouteRedirect } from "@/lib/routeRedirects.ts";

const AREA_LAYOUT: Record<AppArea, ComponentType<{ page?: ComponentType<object> }>> = {
  panel: PanelLayout,
  admin: AdminLayout,
  seller: SellerLayout,
  delivery: DeliveryLayout,
};

const pageCache = new Map<string, ComponentType<object>>();

function lazyPage(loader: RouteSegmentDef["loader"]) {
  const key = loader.toString();
  if (!pageCache.has(key)) {
    pageCache.set(key, lazy(loader));
  }
  return pageCache.get(key)!;
}

const Install = lazy(() => import("@/pages/Install.tsx"));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

/** Páginas internas — render directo, sem `<Route path={...}>` dinâmico (evita scanner Lovable). */
export function CatchAllResolver({ notFound }: { notFound: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/install") {
    return withSuspense(<Install />);
  }

  const legacyRedirect = resolveLegacyRouteRedirect(pathname);
  if (legacyRedirect) {
    return <Navigate to={legacyRedirect} replace />;
  }

  const customerRedirect = resolveCustomerRouteRedirect(pathname, location.search);
  if (customerRedirect) {
    return <Navigate to={{ pathname: customerRedirect.pathname, search: customerRedirect.search }} replace />;
  }

  const routePathname = resolveAdminRestaurantPanelAlias(pathname) ?? pathname;
  const def = resolveRoute(routePathname);
  if (!def) {
    return notFound;
  }

  const Layout = AREA_LAYOUT[def.area];
  const Page = lazyPage(def.loader);

  return withSuspense(
    <AdminErrorBoundary area={def.area}>
      <Layout page={Page} />
    </AdminErrorBoundary>,
  );
}
