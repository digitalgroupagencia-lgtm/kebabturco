import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyBrowserChromeColor, applyStaffAppChrome } from "@/lib/brandTokens";
import { isStaffAppPath } from "@/lib/appRouteKind";
import { dismissBootShell } from "@/lib/bootShell";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { setNativeOrientation } from "@/services/nativeOrientation";

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
      // Painel / Admin / KDS → horizontal; login equipa, entregador e vendedor → vertical.
      const isWideStaff =
        pathname.startsWith("/panel") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/kds");
      void setNativeOrientation(isWideStaff ? "landscape" : "portrait");
    } else {
      applyBrowserChromeColor();
      void setNativeOrientation("portrait");
    }
  }, [pathname]);

  return null;
}
