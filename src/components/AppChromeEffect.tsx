import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyBrowserChromeColor, applyStaffAppChrome } from "@/lib/brandTokens";
import { isStaffAppPath } from "@/lib/appRouteKind";

/** Mantém a cor do topo correcta ao navegar entre site do cliente e admin/painel. */
export default function AppChromeEffect() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (isStaffAppPath(pathname)) {
      applyStaffAppChrome();
    } else {
      applyBrowserChromeColor();
    }
  }, [pathname]);

  return null;
}
