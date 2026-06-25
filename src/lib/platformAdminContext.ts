import { SINGLE_TENANT_MODE } from "@/lib/appMode";
import { isPlatformHost } from "@/lib/platformHosts";
import { isEmbeddedTenantPreview } from "@/lib/tenantPreview";

/** Shell Admin Master SnapOrder (multi-cliente), desactivado em modo Kebab único. */
export function isPlatformAdminContext(hostname?: string | null): boolean {
  if (SINGLE_TENANT_MODE) return false;
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return isPlatformHost(host) && !isEmbeddedTenantPreview();
}
