import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyBrowserChromeColor, applyStaffAppChrome } from "@/lib/brandTokens";
import { isStaffAppPath } from "@/lib/appRouteKind";
import { dismissBootShell } from "@/lib/bootShell";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { setAndroidOrientation } from "@/services/androidOrientation";

/** Mantém a cor do topo correcta ao navegar entre site do cliente e admin/painel. */
export default function AppChromeEffect() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (isLovableEditorPreview()) {
      dismissBootShell();
    }
    if (isStaffAppPath(pathname)) {
      applyStaffAppChrome();
      dismissBootShell();
      // Só a cozinha (KDS) força horizontal na app instalada; painel/admin ficam em vertical.
      const isKds = pathname.startsWith("/kds");
      void setAndroidOrientation(isKds ? "landscape" : "portrait");
    } else {
      applyBrowserChromeColor();
      void setAndroidOrientation("portrait");
    }
  }, [pathname]);

  return null;
}
