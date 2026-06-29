import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { isLovableEditorHost } from "@/lib/platformHosts";

/** Pré-visualização no editor Lovable (iframe *.lovable.app, etc.). */
export function isLovableEditorPreview(): boolean {
  return typeof window !== "undefined" && isLovableEditorHost(window.location.hostname);
}

export const LOVABLE_PREVIEW_SEARCH = `preview=1&tenant=${DEFAULT_TENANT_SLUG}&screen=language`;

export function shouldOpenStorefrontInLovablePreview(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return false;
  // Manter todas as rotas internas/login acessíveis no preview do editor;
  // o admin_master precisa de poder voltar para /admin a partir da storefront.
  return false;
}

export function lovableStorefrontLocation(): { pathname: string; search: string } {
  return { pathname: "/", search: LOVABLE_PREVIEW_SEARCH };
}
