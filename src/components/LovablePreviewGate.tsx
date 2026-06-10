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

  if (pathname === "/" && !search.includes("preview=1")) {
    return <Navigate to={{ pathname: "/", search: LOVABLE_PREVIEW_SEARCH }} replace />;
  }

  return null;
}
