import type { NavigateFunction } from "react-router-dom";
import { nav } from "@/lib/navPaths";
import type { StaffRole } from "@/lib/staffPermissions";
import { saveSavedOrderType, KIOSK_LANG_KEY } from "@/lib/customerSession";

export const STAFF_SESSION_FLAG = "kebabturco.staffSession";
/** Só nesta sessão do browser — fecha o separador e perde-se (admin reabre no cliente). */
export const STAFF_ENTRY_SESSION_KEY = "kebabturco.staffEntry";

export function markStaffSession() {
  try {
    localStorage.setItem(STAFF_SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function clearStaffSessionFlag() {
  try {
    localStorage.removeItem(STAFF_SESSION_FLAG);
  } catch {
    /* ignore */
  }
}

export function markAdminStaffAreaEntry() {
  try {
    sessionStorage.setItem(STAFF_ENTRY_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearAdminStaffAreaEntry() {
  try {
    sessionStorage.removeItem(STAFF_ENTRY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function hasAdminStaffAreaEntry(): boolean {
  try {
    return sessionStorage.getItem(STAFF_ENTRY_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function isStaffAppPathname(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (
    p.startsWith("/admin") ||
    p.startsWith("/panel") ||
    p.startsWith("/seller") ||
    p.startsWith("/delivery") ||
    p === "/staff"
  );
}

/** Admin geral: reabrir app no cliente salvo que estava em /admin ou /panel. */
export function shouldAdminMasterStartAsCustomer(opts: {
  role?: StaffRole | string | null;
  pathname: string;
}): boolean {
  if (opts.role !== "admin_master") return false;
  if (!isStaffAppPathname(opts.pathname)) return false;
  return !hasAdminStaffAreaEntry();
}

export function isStaffSessionFlagSet(): boolean {
  try {
    return localStorage.getItem(STAFF_SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Tablets da equipa ficam no painel ao reabrir; admin geral abre sempre no cliente. */
export function shouldPersistStaffTabletSession(role: StaffRole | string | null | undefined): boolean {
  return role !== "admin_master";
}

export function markStaffSessionForRole(role: StaffRole | string | null | undefined) {
  if (shouldPersistStaffTabletSession(role)) markStaffSession();
}

/**
 * Só tablets com login explícito da equipa (/staff) devem sair do totem em `/`.
 * Admin geral mantém sessão mas reabre no cardápio (idiomas).
 */
export function shouldRedirectRootToStaffPanel(opts: {
  pathname: string;
  staffSessionFlag: boolean;
  hasUser: boolean;
  search?: string;
  role?: StaffRole | string | null;
}): boolean {
  const root = opts.pathname.replace(/\/+$/, "") || "/";
  if (root !== "/" || !opts.staffSessionFlag || !opts.hasUser) return false;
  if (opts.role === "admin_master") return false;
  try {
    const params = new URLSearchParams(
      opts.search ?? (typeof window !== "undefined" ? window.location.search : ""),
    );
    if (params.get("demo_visita") === "1") return false;
  } catch {
    /* ignore */
  }
  return true;
}

/** Volta ao totem do cliente (idioma → tipo de pedido → menu). */
export function returnToCustomerTotemStart(navigate: NavigateFunction) {
  clearStaffSessionFlag();
  saveSavedOrderType(null);
  navigate({ pathname: nav.home(), search: "?screen=language" }, { replace: true });
}

/** Abre o cardápio como cliente real, mantendo login admin (sem logout). */
export function openCustomerStorefrontFromStaff(navigate: NavigateFunction) {
  clearStaffSessionFlag();
  clearAdminStaffAreaEntry();
  saveSavedOrderType(null);
  try {
    localStorage.removeItem(KIOSK_LANG_KEY);
  } catch {
    /* ignore */
  }
  navigate({ pathname: nav.home(), search: "?screen=language" }, { replace: true });
}

/** Painel operacional — tablets reabrem no painel; admin geral não altera o arranque. */
export function openStaffLivePanel(
  navigate: NavigateFunction,
  role?: StaffRole | string | null,
) {
  markStaffSessionForRole(role);
  if (role === "admin_master") markAdminStaffAreaEntry();
  navigate(nav.panel("live"));
}

/** Destino após login da equipa, separado do fluxo do cliente. */
export function resolveStaffLoginDestination(role: StaffRole | string | null | undefined): string {
  switch (role) {
    case "delivery":
      return nav.delivery();
    case "kitchen":
      return nav.panel("live");
    case "cashier":
      return nav.panel("cashier");
    case "admin_master":
      return nav.admin();
    case "seller":
      return nav.seller();
    case "restaurant_admin":
    case "manager":
      return nav.panel("dashboard");
    case "operator":
    case "attendant":
      return nav.panel("live");
    default:
      return nav.panel("live");
  }
}
