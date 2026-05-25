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
  return isPlatformHost(hostname);
}

/** Editor Lovable — tratar como plataforma SnapOrder (login em /). */
export function isLovableEditorHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return (
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev")
  );
}

/** Domínio da plataforma SnapOrder (produção ou editor Lovable). */
export function isPlatformHost(hostname?: string | null): boolean {
  return isAdminMasterHost(hostname) || isLovableEditorHost(hostname);
}

/** Ambiente local — pode usar tenant demo sem custom_domain. */
export function isDevPreviewHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return host === "localhost" || host.startsWith("127.0.0.1");
}
