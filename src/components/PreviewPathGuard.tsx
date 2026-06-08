import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fixBrokenEditorLocation, isBrokenEditorPath, isReservedAppPath } from "@/lib/appPaths";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { nav, resolveRoute } from "@/lib/navPaths.ts";
import { legacyBareSegmentTarget } from "@/lib/panelAccess";
import {
  detectTenantSlugFromLocation,
  isLovableEditorPreview,
  lovableStorefrontLocation,
  shouldOpenStorefrontInLovablePreview,
} from "@/lib/lovablePreview";
import {
  resolveCustomerRouteRedirect,
  resolveLegacyRouteRedirect,
} from "@/lib/routeRedirects.ts";

const LEGACY_ADMIN_SEGMENTS = new Set(["tenants", "domains", "billing"]);

/**
 * Corrige endereços inválidos ou legados do preview (wildcards, SnapOrder multi-cliente).
 */
export default function PreviewPathGuard() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLovableEditorPreview() && shouldOpenStorefrontInLovablePreview(pathname)) {
      const slug = detectTenantSlugFromLocation(pathname, search);
      const target = lovableStorefrontLocation(slug);
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
      const slug = detectTenantSlugFromLocation(pathname, search);
      navigate(lovableStorefrontLocation(slug), { replace: true });
      return;
    }

    const parts = pathname.split("/").filter(Boolean);

    if (
      parts[0] === "admin" &&
      LEGACY_ADMIN_SEGMENTS.has(parts[1] ?? "") &&
      !(parts[1] === "tenants" && parts[2] === "new")
    ) {
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
      // Slug de tenant — preserva como ?tenant= em vez de descartar.
      navigate(
        { pathname: nav.home(), search: `?tenant=${parts[0]}` },
        { replace: true },
      );
    }
  }, [pathname, search, navigate]);

  return null;
}
