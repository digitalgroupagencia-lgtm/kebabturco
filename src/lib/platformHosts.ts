import { APP_NAME, SINGLE_TENANT_MODE } from "@/lib/appMode";

/** Hostnames legados SnapOrder (não usados neste deploy). */
export const ADMIN_MASTER_HOSTS = [
  "snaporder.digitalgroupsti.com",
  "admin.snaporder.es",
] as const;

export const PLATFORM_NAME = APP_NAME;

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase().trim();
}

export function isAdminMasterHost(hostname?: string | null): boolean {
  if (SINGLE_TENANT_MODE) return false;
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return ADMIN_MASTER_HOSTS.some((h) => h === host);
}

export function isPlatformReservedHost(hostname?: string | null): boolean {
  return isPlatformHost(hostname);
}

export function isLovableEditorHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return (
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev")
  );
}

/** Domínio plataforma SnapOrder, desactivado: projecto = Kebab Turco em qualquer host. */
export function isPlatformHost(hostname?: string | null): boolean {
  if (SINGLE_TENANT_MODE) return false;
  return isAdminMasterHost(hostname) || isLovableEditorHost(hostname);
}

export function isDevPreviewHost(hostname?: string | null): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return host === "localhost" || host.startsWith("127.0.0.1");
}

/** Desenvolvimento / Lovable, usar tenant Kebab por defeito. */
export function isDefaultKebabContextHost(hostname?: string | null): boolean {
  if (!hostname) return true;
  const host = normalizeHostname(hostname);
  if (host === "kebabturco.net") return true;
  return isDevPreviewHost(host) || isLovableEditorHost(host);
}
