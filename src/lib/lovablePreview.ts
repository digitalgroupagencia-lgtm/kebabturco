import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { isLovableEditorHost } from "@/lib/platformHosts";
import { isReservedAppPath } from "@/lib/appPaths";

/** Pré-visualização no editor Lovable (iframe *.lovable.app, etc.). */
export function isLovableEditorPreview(): boolean {
  return typeof window !== "undefined" && isLovableEditorHost(window.location.hostname);
}

export const LOVABLE_PREVIEW_SEARCH = `preview=1&tenant=${DEFAULT_TENANT_SLUG}&screen=language`;

export function shouldOpenStorefrontInLovablePreview(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p !== "/" && !/^\/(panel|admin|delivery|seller|staff|auth|cashier|install)(\/|$)/.test(p);
}

/** Slug actual do tenant (query ?tenant= ou primeiro segmento livre). */
export function detectTenantSlugFromLocation(
  pathname?: string,
  search?: string,
): string | null {
  if (typeof window === "undefined" && pathname == null) return null;
  const path = pathname ?? window.location.pathname;
  const qs = search ?? window.location.search;
  const params = new URLSearchParams(qs);
  const fromQuery = params.get("tenant");
  if (fromQuery) return fromQuery;
  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  if (first === "preview") return segments[1] ?? null;
  if (first && !isReservedAppPath(first) && segments.length === 1) return first;
  return null;
}

export function lovableStorefrontLocation(
  slug?: string | null,
): { pathname: string; search: string } {
  const tenant = slug || detectTenantSlugFromLocation() || DEFAULT_TENANT_SLUG;
  return { pathname: "/", search: `preview=1&tenant=${tenant}&screen=language` };
}
