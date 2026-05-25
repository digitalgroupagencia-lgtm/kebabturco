import { APP_NAME, SINGLE_TENANT_MODE } from "@/lib/appMode";

/** Administrador geral do projecto (planos, centrais, definições globais). */
export const GENERAL_ADMIN_ROLE = "admin_master" as const;

/** Administrador do restaurante (operação diária). */
export const RESTAURANT_ADMIN_ROLE = "restaurant_admin" as const;

export const PROJECT_ADMIN_ROLES = [GENERAL_ADMIN_ROLE, RESTAURANT_ADMIN_ROLE] as const;

export function isGeneralAdmin(role: string | null | undefined): boolean {
  return role === GENERAL_ADMIN_ROLE;
}

/** Acesso à área /admin — só administrador geral. */
export function canAccessGeneralAdmin(role: string | null | undefined): boolean {
  return isGeneralAdmin(role);
}

/** @deprecated Usar canAccessGeneralAdmin ou isGeneralAdmin */
export function canAccessProjectAdmin(role: string | null | undefined): boolean {
  return canAccessGeneralAdmin(role);
}

export { APP_NAME, SINGLE_TENANT_MODE, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
