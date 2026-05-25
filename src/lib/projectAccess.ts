import { APP_NAME, SINGLE_TENANT_MODE } from "@/lib/appMode";

/** Roles com acesso à área /admin avançada deste projecto. */
export const PROJECT_ADMIN_ROLES = ["admin_master", "restaurant_admin"] as const;

export function canAccessProjectAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PROJECT_ADMIN_ROLES as readonly string[]).includes(role);
}

export { APP_NAME, SINGLE_TENANT_MODE, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
