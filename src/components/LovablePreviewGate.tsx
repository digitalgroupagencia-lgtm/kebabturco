import { Navigate, useLocation } from "react-router-dom";
import {
  isLovableEditorPreview,
  lovableStorefrontLocation,
  LOVABLE_PREVIEW_SEARCH,
  shouldOpenStorefrontInLovablePreview,
} from "@/lib/lovablePreview";

/** Redireccionamento síncrono no editor Lovable — evita 1º frame em branco no painel. */
export default function LovablePreviewGate() {
  const { pathname, search } = useLocation();

  if (!isLovableEditorPreview()) return null;

  if (shouldOpenStorefrontInLovablePreview(pathname)) {
    return <Navigate to={lovableStorefrontLocation()} replace />;
  }

  if (pathname === "/") {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    if (!params.get("screen")) {
      return <Navigate to={lovableStorefrontLocation()} replace />;
    }
  }

  return null;
}
