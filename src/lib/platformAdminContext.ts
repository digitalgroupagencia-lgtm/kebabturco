import { isPlatformHost } from "@/lib/platformHosts";
import { isEmbeddedTenantPreview } from "@/lib/tenantPreview";

/** Domínio da plataforma SnapOrder (admin, auth) — não prévia embebida de tenant. */
export function isPlatformAdminContext(hostname?: string | null): boolean {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return isPlatformHost(host) && !isEmbeddedTenantPreview();
}
