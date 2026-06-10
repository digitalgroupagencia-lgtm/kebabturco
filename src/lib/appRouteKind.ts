/** Rotas do cliente (totem / site público) vs painel / administração. */
export function isCustomerStorefrontPath(pathname?: string): boolean {
  const p = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/")).replace(/\/+$/, "") || "/";
  if (p.startsWith("/admin")) return false;
  if (p.startsWith("/panel")) return false;
  if (p.startsWith("/auth")) return false;
  if (p.startsWith("/seller")) return false;
  if (p.startsWith("/staff")) return false;
  if (p.startsWith("/ligar-conta")) return false;
  return true;
}

export function isStaffAppPath(pathname?: string): boolean {
  return !isCustomerStorefrontPath(pathname);
}
