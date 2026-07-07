import { KEBAB_TURCO_PUBLIC_ORIGIN } from "@/lib/tenantUrls";

export const STAFF_PASSWORD_RESET_PATH = "/senhareset";

export function getStaffPasswordRecoveryUrl(): string {
  return `${KEBAB_TURCO_PUBLIC_ORIGIN}${STAFF_PASSWORD_RESET_PATH}`;
}

export function hasPasswordRecoveryToken(location: Location = window.location): boolean {
  const hash = location.hash || "";
  if (hash.includes("type=recovery")) return true;
  return new URLSearchParams(location.search).get("type") === "recovery";
}

export function isStaffPasswordResetPath(location: Location = window.location): boolean {
  return location.pathname.replace(/\/+$/, "") === STAFF_PASSWORD_RESET_PATH;
}

/**
 * Links antigos podiam abrir /panel/cashier com o token no hash.
 * Corrige antes do router carregar, preservando token/query para criar a nova senha.
 */
export function forceStaffRecoveryPathWhenNeeded(): void {
  if (typeof window === "undefined") return;
  if (!hasPasswordRecoveryToken(window.location)) return;
  if (isStaffPasswordResetPath(window.location)) return;

  const nextUrl = `${STAFF_PASSWORD_RESET_PATH}${window.location.search}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}