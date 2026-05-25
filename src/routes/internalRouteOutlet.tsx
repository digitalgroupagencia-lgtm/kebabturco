import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import PageSpinner from "@/components/PageSpinner.tsx";
import PanelLayout from "@/components/panel/PanelLayout.tsx";
import AdminLayout from "@/components/admin/AdminLayout.tsx";
import SellerLayout from "@/components/seller/SellerLayout.tsx";
import {
  pathForRouteDef,
  resolveRoute,
  type AppArea,
  type RouteSegmentDef,
} from "@/lib/navPaths.ts";

const AREA_LAYOUT: Record<AppArea, ComponentType> = {
  panel: PanelLayout,
  admin: AdminLayout,
  seller: SellerLayout,
};

const pageCache = new Map<string, ComponentType<object>>();

function lazyPage(loader: RouteSegmentDef["loader"]) {
  const key = loader.toString();
  if (!pageCache.has(key)) {
    pageCache.set(key, lazy(loader));
  }
  return pageCache.get(key)!;
}

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

/** Rotas internas resolvidas em runtime (sem `<Route path="/panel/...">` literais). */
export function CatchAllResolver({ notFound }: { notFound: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  const def = resolveRoute(pathname);
  if (!def) {
    return notFound;
  }

  const Layout = AREA_LAYOUT[def.area];
  const Page = lazyPage(def.loader);
  const path = pathForRouteDef(def);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes location={location}>
        <Route element={withSuspense(<Layout />)}>
          <Route path={path} element={withSuspense(<Page />)} />
        </Route>
      </Routes>
    </Suspense>
  );
}
