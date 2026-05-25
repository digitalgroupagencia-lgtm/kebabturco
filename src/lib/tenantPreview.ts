import { withCacheBust } from "@/lib/appCacheBust";
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

export function isAdminPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "1";
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

/** URL do totem real para iframe de pré-visualização no workspace do tenant. */
export function buildTenantPreviewUrl(options: {
  tenant: TenantUrlConfig & { slug: string };
  screen: TenantPreviewScreen;
  productId?: string | null;
  seedCheckout?: boolean;
  cacheToken?: string | number;
}): string {
  const url = new URL(buildTenantUrl(options.tenant, "/"));
  url.searchParams.set("preview", "1");
  url.searchParams.set("screen", options.screen);
  if (options.productId) url.searchParams.set("productId", options.productId);
  if (options.seedCheckout) url.searchParams.set("seedCheckout", "1");
  return withCacheBust(url.toString(), options.cacheToken);
}

export function getPreviewPostMessageTarget(previewUrl: string): string {
  try {
    return new URL(previewUrl).origin;
  } catch {
    return "*";
  }
}
