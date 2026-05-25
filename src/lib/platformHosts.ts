/** Hostnames reservados para o Admin Master da plataforma SnapOrder. */
export const ADMIN_MASTER_HOSTS = [
  "snaporder.digitalgroupsti.com",
  "admin.snaporder.es",
] as const;

export const PLATFORM_NAME = "SnapOrder";

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase().trim();
}

export function isAdminMasterHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return ADMIN_MASTER_HOSTS.some((h) => h === host);
}

export function isPlatformReservedHost(hostname?: string | null): boolean {
  return isAdminMasterHost(hostname);
}

/** Ambientes de preview/dev — podem usar tenant demo sem custom_domain. */
export function isDevPreviewHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return (
    host === "localhost" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev") ||
    host.startsWith("127.0.0.1")
  );
}
