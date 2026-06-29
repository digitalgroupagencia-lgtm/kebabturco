import { Navigate, useLocation } from "react-router-dom";
import { fixBrokenEditorLocation, isBrokenEditorPath } from "@/lib/appPaths";
import { LOVABLE_WILDCARD_HINT } from "@/lib/routeMap";
import {
  isLovableEditorPreview,
  lovableStorefrontLocation,
  shouldOpenStorefrontInLovablePreview,
} from "@/lib/lovablePreview";

/** Redireccionamento síncrono no editor Lovable — evita 1º frame em branco no painel. */
export default function LovablePreviewGate() {
  const { pathname, search } = useLocation();

  if (isBrokenEditorPath(pathname)) {
    const { pathname: fixed, search: fixedSearch } = fixBrokenEditorLocation(pathname);
    return <Navigate to={{ pathname: fixed, search: fixedSearch }} replace />;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("routeHint") === LOVABLE_WILDCARD_HINT) {
    params.delete("routeHint");
    const nextSearch = params.toString();
    return <Navigate to={{ pathname, search: nextSearch ? `?${nextSearch}` : "" }} replace />;
  }

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
