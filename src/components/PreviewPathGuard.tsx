import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fixBrokenEditorLocation, isBrokenEditorPath, isReservedAppPath } from "@/lib/appPaths";
import { LOVABLE_WILDCARD_HINT } from "@/lib/routeMap";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { nav, resolveRoute } from "@/lib/navPaths.ts";
import { legacyBareSegmentTarget } from "@/lib/panelAccess";
import {
  isLovableEditorPreview,
  lovableStorefrontLocation,
  shouldOpenStorefrontInLovablePreview,
} from "@/lib/lovablePreview";
import {
  resolveCustomerRouteRedirect,
  resolveLegacyRouteRedirect,
} from "@/lib/routeRedirects.ts";

const LEGACY_PREVIEW_SEARCH = `?preview=1&tenant=${DEFAULT_TENANT_SLUG}`;

const LEGACY_ADMIN_SEGMENTS = new Set(["tenants", "domains", "billing"]);

/**
 * Corrige endereços inválidos ou legados do preview (wildcards, SnapOrder multi-cliente).
 */
export default function PreviewPathGuard() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("routeHint") === LOVABLE_WILDCARD_HINT) {
      params.delete("routeHint");
      const next = params.toString();
      navigate({ pathname, search: next ? `?${next}` : "" }, { replace: true });
      return;
    }

    if (isLovableEditorPreview() && shouldOpenStorefrontInLovablePreview(pathname)) {
      const target = lovableStorefrontLocation();
      navigate(target, { replace: true });
      return;
    }

    if (isBrokenEditorPath(pathname)) {
      const { pathname: fixed, search } = fixBrokenEditorLocation(pathname);
      navigate({ pathname: fixed, search }, { replace: true });
      return;
    }

    const legacyRedirect = resolveLegacyRouteRedirect(pathname);
    if (legacyRedirect) {
      navigate(legacyRedirect, { replace: true });
      return;
    }

    const customerRedirect = resolveCustomerRouteRedirect(pathname, search);
    if (customerRedirect) {
      navigate(customerRedirect, { replace: true });
      return;
    }

    if (pathname === "/kebab-turco") {
      navigate(nav.home(), { replace: true });
      return;
    }

    if (pathname === "/preview/kebab-turco" || pathname.startsWith("/preview/")) {
      navigate({ pathname: nav.home(), search: LEGACY_PREVIEW_SEARCH }, { replace: true });
      return;
    }

    const parts = pathname.split("/").filter(Boolean);

    if (parts[0] === "admin" && LEGACY_ADMIN_SEGMENTS.has(parts[1] ?? "")) {
      navigate(nav.admin(), { replace: true });
      return;
    }

    if (parts[0] === "painel") {
      navigate(parts[1] === "dashboard" ? nav.panel("dashboard") : nav.panel(), { replace: true });
      return;
    }

    if (parts[0] === "centrals" && parts[1]) {
      navigate(nav.admin("centrals", parts[1]), { replace: true });
      return;
    }

    if (parts.length === 1 && !isReservedAppPath(parts[0])) {
      const legacy = legacyBareSegmentTarget(parts[0]);
      if (legacy) {
        navigate(legacy, { replace: true });
        return;
      }
      const sellerTarget = nav.seller(parts[0]);
      if (resolveRoute(sellerTarget)) {
        navigate(sellerTarget, { replace: true });
        return;
      }
    }

    if (parts.length === 1 && !isReservedAppPath(parts[0])) {
      navigate(nav.home(), { replace: true });
    }
  }, [pathname, search, navigate]);

  return null;
}
