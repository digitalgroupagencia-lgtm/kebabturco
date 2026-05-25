import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fixBrokenEditorLocation, isBrokenEditorPath, isReservedAppPath } from "@/lib/appPaths";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";

const LEGACY_PREVIEW_SEARCH = `?preview=1&tenant=${DEFAULT_TENANT_SLUG}`;

const LEGACY_ADMIN_PREFIXES = ["/admin/tenants", "/admin/domains", "/admin/billing"];

/**
 * Corrige endereços inválidos ou legados do preview (wildcards, SnapOrder multi-cliente).
 */
export default function PreviewPathGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isBrokenEditorPath(pathname)) {
      const { pathname: fixed, search } = fixBrokenEditorLocation(pathname);
      navigate({ pathname: fixed, search }, { replace: true });
      return;
    }

    if (pathname === "/kebab-turco") {
      navigate("/", { replace: true });
      return;
    }

    if (pathname === "/preview/kebab-turco" || pathname.startsWith("/preview/")) {
      navigate({ pathname: "/", search: LEGACY_PREVIEW_SEARCH }, { replace: true });
      return;
    }

    if (LEGACY_ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      navigate("/admin", { replace: true });
      return;
    }

    const slug = pathname.split("/").filter(Boolean)[0];
    if (slug && !isReservedAppPath(slug) && pathname.split("/").filter(Boolean).length === 1) {
      navigate("/", { replace: true });
    }
  }, [pathname, navigate]);

  return null;
}
