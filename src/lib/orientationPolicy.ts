import { isCustomerStorefrontPath } from "@/lib/appRouteKind";

/** Admin master, painel do restaurante e KDS, layout horizontal em tablet/telemóvel. */
export function isLandscapeLockedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p.startsWith("/admin") || p.startsWith("/panel") || p.startsWith("/kds");
}

/** Totem cliente, login equipa, entregador e vendedor, sempre vertical. */
export function isPortraitLockedPath(pathname: string): boolean {
  if (isLandscapeLockedPath(pathname)) return false;
  if (isCustomerStorefrontPath(pathname)) return true;
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/staff") || p.startsWith("/auth")) return true;
  if (p.startsWith("/delivery") || p.startsWith("/seller")) return true;
  return false;
}

/** Activa breakpoints de layout largo (como desktop) em telemóvel horizontal. */
export function isStaffWideLayoutPath(pathname: string): boolean {
  return isLandscapeLockedPath(pathname);
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0)
  );
}

export function isCoarseTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
  return isTouchDevice();
}
