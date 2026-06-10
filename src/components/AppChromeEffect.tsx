import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyBrowserChromeColor, applyStaffAppChrome } from "@/lib/brandTokens";
import { isStaffAppPath } from "@/lib/appRouteKind";
import { dismissBootShell } from "@/lib/bootShell";
import { setAndroidOrientation } from "@/services/androidOrientation";

/** Mantém a cor do topo correcta ao navegar entre site do cliente e admin/painel. */
export default function AppChromeEffect() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (isStaffAppPath(pathname)) {
      applyStaffAppChrome();
      dismissBootShell();
      // Painel / Admin / KDS rodam em tablet → forçar landscape.
      // Entregador (/delivery) e Vendedor (/seller) rodam em celular → portrait.
      const isTabletStaff =
        pathname.startsWith("/panel") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/kds");
      void setAndroidOrientation(isTabletStaff ? "landscape" : "portrait");
    } else {
      applyBrowserChromeColor();
      void setAndroidOrientation("portrait");
    }
    dismissBootShell();
  }, [pathname]);

  return null;
}
