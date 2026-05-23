import { normalizeHostname } from "@/lib/platformHosts";

export type TenantUrlConfig = {
  slug: string;
  custom_domain?: string | null;
  path_slug?: string | null;
  use_master_domain?: boolean;
  master_domain?: string | null;
};

function cleanDomain(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "").trim();
}

/** Origem pública do tenant (protocolo + domínio, sem path). */
export function getTenantPublicOrigin(tenant: TenantUrlConfig, fallbackOrigin = ""): string {
  if (tenant.custom_domain) return `https://${cleanDomain(tenant.custom_domain)}`;
  if (tenant.use_master_domain && tenant.master_domain) {
    return `https://${cleanDomain(tenant.master_domain)}`;
  }
  const fb = fallbackOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  return fb.replace(/\/$/, "");
}

/** Prefixo de path quando o tenant usa subcaminho no domínio principal. */
export function getTenantTotemPath(tenant: TenantUrlConfig): string {
  if (tenant.custom_domain) return "";
  const seg = tenant.path_slug || "";
  if (!seg) return "";
  return `/${seg.replace(/^\//, "")}`;
}

/**
 * URL pública do tenant.
 * @param route ex. "", "/panel", "/seller", "/auth"
 */
export function buildTenantUrl(tenant: TenantUrlConfig, route = "", fallbackOrigin?: string): string {
  const origin = getTenantPublicOrigin(tenant, fallbackOrigin);
  const prefix = getTenantTotemPath(tenant);
  const routePart = route ? (route.startsWith("/") ? route : `/${route}`) : "";
  const pathname = `${prefix}${routePart}` || "/";
  const url = new URL(pathname, `${origin}/`);

  const needsTenantQuery =
    !tenant.custom_domain &&
    !tenant.use_master_domain &&
    !tenant.path_slug &&
    !!tenant.slug &&
    !route;

  if (needsTenantQuery) url.searchParams.set("tenant", tenant.slug);
  return url.href;
}

export function getTenantTotemUrl(tenant: TenantUrlConfig, fallbackOrigin?: string): string {
  return buildTenantUrl(tenant, "", fallbackOrigin);
}

export function getTableQrUrl(tenant: TenantUrlConfig, mesaNumber: string, fallbackOrigin?: string): string {
  const url = new URL(buildTenantUrl(tenant, "", fallbackOrigin));
  url.searchParams.set("mesa", mesaNumber);
  return url.href;
}

/** Verifica se o hostname corresponde ao domínio próprio do tenant. */
export function hostnameMatchesTenant(host: string, tenant: TenantUrlConfig): boolean {
  const h = normalizeHostname(host);
  if (tenant.custom_domain && h === normalizeHostname(cleanDomain(tenant.custom_domain))) return true;
  if (tenant.use_master_domain && tenant.master_domain && h === normalizeHostname(cleanDomain(tenant.master_domain))) {
    return true;
  }
  return false;
}
