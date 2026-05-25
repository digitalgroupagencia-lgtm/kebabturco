import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Route } from "react-router-dom";
import PageSpinner from "@/components/PageSpinner.tsx";

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{node}</Suspense>
);

const pageCache = new Map<string, ComponentType<object>>();

function lazyPage(loader: () => Promise<{ default: ComponentType<object> }>) {
  const key = loader.toString();
  if (!pageCache.has(key)) {
    pageCache.set(key, lazy(loader));
  }
  return pageCache.get(key)!;
}

type RouteLoader = { path: string; module: () => Promise<{ default: ComponentType<object> }> };

/** Gera rotas com caminho absoluto dentro de um layout partilhado. */
export function buildLayoutRoutes(
  Layout: ComponentType,
  entries: readonly RouteLoader[],
) {
  return (
    <Route element={withSuspense(<Layout />)}>
      {entries.map(({ path, module }) => {
        const Page = lazyPage(module);
        return <Route key={path} path={path} element={withSuspense(<Page />)} />;
      })}
    </Route>
  );
}
