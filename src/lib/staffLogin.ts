import { nav } from "@/lib/navPaths";
import type { StaffRole } from "@/lib/staffPermissions";

export const STAFF_SESSION_FLAG = "kebabturco.staffSession";

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

export function isStaffSessionFlagSet(): boolean {
  try {
    return localStorage.getItem(STAFF_SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Destino após login da equipa — separado do fluxo do cliente. */
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
