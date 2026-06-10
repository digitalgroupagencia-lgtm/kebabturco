import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { isLovableEditorHost } from "@/lib/platformHosts";

/** Pré-visualização no editor Lovable (iframe *.lovable.app, etc.). */
export function isLovableEditorPreview(): boolean {
  return typeof window !== "undefined" && isLovableEditorHost(window.location.hostname);
}

export const LOVABLE_PREVIEW_SEARCH = `preview=1&tenant=${DEFAULT_TENANT_SLUG}&screen=language`;

export function shouldOpenStorefrontInLovablePreview(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p !== "/" && !/^\/(panel|admin|delivery|seller|staff|auth|cashier|install)(\/|$)/.test(p);
}

export function lovableStorefrontLocation(): { pathname: string; search: string } {
  return { pathname: "/", search: LOVABLE_PREVIEW_SEARCH };
}
