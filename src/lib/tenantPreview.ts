import { withCacheBust } from "@/lib/appCacheBust";
import { isPlatformHost } from "@/lib/platformHosts";
import { buildTenantUrl, type TenantUrlConfig } from "@/lib/tenantUrls";

export type TenantPreviewScreen =
  | "splash"
  | "language"
  | "storeSelect"
  | "orderType"
  | "home"
  | "product"
  | "review"
  | "payment";

export const PREVIEW_MESSAGE_TYPE = "snaporder:preview-branding" as const;

const PREVIEW_PATH_RE = /^\/preview\/([^/]+)/;

/** Slug do restaurante em prévia (query ?tenant= ou caminho /preview/slug). */
export function getPreviewTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "1" && params.get("tenant")) {
    return params.get("tenant");
  }
  const match = window.location.pathname.match(PREVIEW_PATH_RE);
  return match?.[1] ?? null;
}

export function isAdminPreviewMode(): boolean {
  return getPreviewTenantSlug() != null;
}

/** Prévia de restaurante dentro da plataforma SnapOrder ou editor Lovable. */
export function isEmbeddedTenantPreview(): boolean {
  return getPreviewTenantSlug() != null;
}

/** Caminho de prévia no editor Lovable (ex.: /preview/kebab-turco). */
export function buildLovableTenantPreviewPath(tenantSlug: string, subpath = ""): string {
  const base = `/preview/${tenantSlug}`;
  if (!subpath) return base;
  return subpath.startsWith("/") ? `${base}${subpath}` : `${base}/${subpath}`;
}

export function getTenantPublicDomain(tenant: TenantUrlConfig): string {
  if (tenant.custom_domain) {
    return tenant.custom_domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
  if (tenant.use_master_domain && tenant.master_domain) {
    const host = tenant.master_domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (tenant.path_slug) return `${host}/${tenant.path_slug}`;
    return host;
  }
  return typeof window !== "undefined" ? window.location.host : "";
}

/**
 * URL para iframe de prévia no workspace admin.
 * No domínio SnapOrder usa a mesma origem + ?tenant= (evita login SnapOrder no iframe).
 * Link «abrir site real» usa buildTenantPublicPreviewUrl.
 */
export function buildTenantEmbedPreviewUrl(options: {
  tenant: TenantUrlConfig & { slug: string };
  screen: TenantPreviewScreen;
  productId?: string | null;
  seedCheckout?: boolean;
  cacheToken?: string | number;
}): string {
  const params = new URLSearchParams();
  params.set("preview", "1");
  params.set("screen", options.screen);
  params.set("tenant", options.tenant.slug);
  if (options.productId) params.set("productId", options.productId);
  if (options.seedCheckout) params.set("seedCheckout", "1");

  const onPlatformAdmin =
    typeof window !== "undefined" && isPlatformHost(window.location.hostname);

  const base = onPlatformAdmin
    ? `${window.location.origin}${buildLovableTenantPreviewPath(options.tenant.slug)}?${params.toString()}`
    : (() => {
        const url = new URL(buildTenantUrl(options.tenant, "/"));
        params.forEach((v, k) => url.searchParams.set(k, v));
        return url.toString();
      })();

  return withCacheBust(base, options.cacheToken);
}

/** URL pública real do tenant (domínio próprio) — nova aba / produção. */
export function buildTenantPublicPreviewUrl(options: {
  tenant: TenantUrlConfig & { slug: string };
  screen: TenantPreviewScreen;
  productId?: string | null;
  seedCheckout?: boolean;
}): string {
  const url = new URL(buildTenantUrl(options.tenant, "/"));
  url.searchParams.set("preview", "1");
  url.searchParams.set("screen", options.screen);
  if (options.productId) url.searchParams.set("productId", options.productId);
  if (options.seedCheckout) url.searchParams.set("seedCheckout", "1");
  return url.toString();
}

/** @deprecated Use buildTenantEmbedPreviewUrl */
export function buildTenantPreviewUrl(options: Parameters<typeof buildTenantEmbedPreviewUrl>[0]): string {
  return buildTenantEmbedPreviewUrl(options);
}

export function getPreviewPostMessageTarget(previewUrl: string): string {
  try {
    return new URL(previewUrl).origin;
  } catch {
    return "*";
  }
}
