import { Navigate, useLocation } from "react-router-dom";
import {
  detectTenantSlugFromLocation,
  isLovableEditorPreview,
  lovableStorefrontLocation,
  shouldOpenStorefrontInLovablePreview,
} from "@/lib/lovablePreview";

/** Redireccionamento síncrono no editor Lovable — evita 1º frame em branco no painel. */
export default function LovablePreviewGate() {
  const { pathname, search } = useLocation();

  if (!isLovableEditorPreview()) return null;

  if (shouldOpenStorefrontInLovablePreview(pathname)) {
    const slug = detectTenantSlugFromLocation(pathname, search);
    return <Navigate to={lovableStorefrontLocation(slug)} replace />;
  }

  if (pathname === "/" && !search.includes("preview=1")) {
    const slug = detectTenantSlugFromLocation(pathname, search);
    return <Navigate to={lovableStorefrontLocation(slug)} replace />;
  }

  return null;
}
