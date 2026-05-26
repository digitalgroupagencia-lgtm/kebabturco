import { nav } from "@/lib/navPaths.ts";

export type CustomerRouteAliasScreen = "home" | "payment" | "confirmation" | "tracking" | "account" | "orderType";

/** Rotas públicas antigas/amigáveis → ecrã interno do cliente. */
const CUSTOMER_ROUTE_ALIASES: Readonly<Record<string, CustomerRouteAliasScreen>> = {
  "/menu": "home",
  "/cardapio": "home",
  "/checkout": "payment",
  "/pagamento": "payment",
  "/confirmacao": "confirmation",
  "/pedido-concluido": "confirmation",
  "/confirmation": "confirmation",
  "/acompanhar": "tracking",
  "/acompanhar-pedido": "tracking",
  "/tracking": "tracking",
  "/meus-pedidos": "account",
  "/pedidos": "account",
  "/mesa": "orderType",
  "/qr": "orderType",
};

/** Rotas antigas ou alias → destino canónico (sem 404). */
const EXACT_REDIRECTS: Readonly<Record<string, string>> = {
  "/admin/payments": nav.admin("operations"),
  "/admin/payment": nav.admin("operations"),
  "/admin/config": nav.admin("settings"),
  "/admin/configuration": nav.admin("settings"),
  "/panel/orders": nav.panel(),
  "/panel/order": nav.panel(),
  "/panel/pedidos": nav.panel(),
  "/panel/qrcodes": nav.panel("tables"),
  "/panel/qrcode": nav.panel("tables"),
  "/panel/qr-codes": nav.panel("tables"),
  "/panel/branding": nav.admin("branding"),
  "/panel/banners": nav.admin("banner"),
  "/panel/modifiers": nav.admin("modifiers"),
  "/panel/delivery-zones": nav.admin("delivery-zones"),
  "/panel/payments": nav.admin("operations"),
  "/cashier": nav.panel("cashier"),
  "/painel": nav.panel(),
  "/painel/pedidos": nav.panel(),
};

/** prefixo → função que devolve destino */
const PREFIX_REDIRECTS: Readonly<
  Array<{ prefix: string; resolve: (rest: string) => string | null }>
> = [
  {
    prefix: "/admin/projects",
    resolve: () => nav.home(),
  },
];

/** Aliases do admin que devem ABRIR o painel do restaurante, sem trocar de volta para /admin. */
const ADMIN_RESTAURANT_PANEL_ALIASES: Readonly<Record<string, string>> = {
  "/admin/panel": nav.panel(),
  "/admin/panels": nav.panel(),
  "/admin/orders": nav.panel(),
  "/admin/order": nav.panel(),
  "/admin/pedidos": nav.panel(),
  "/admin/qrcodes": nav.panel("tables"),
  "/admin/qrcode": nav.panel("tables"),
  "/admin/qr-codes": nav.panel("tables"),
  "/admin/qr": nav.panel("tables"),
  "/admin/finance": nav.panel("finance"),
  "/admin/settings": nav.panel("settings"),
  "/admin/menu": nav.panel("menu"),
};

export function normalizePathname(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p.toLowerCase() === p ? p : p; // keep case for paths; normalize trailing slash only
}

/** Devolve URL de redirect ou null se a rota for canónica. */
export function resolveLegacyRouteRedirect(pathname: string): string | null {
  const p = normalizePathname(pathname);

  const exact = EXACT_REDIRECTS[p];
  if (exact) return exact;

  for (const { prefix, resolve } of PREFIX_REDIRECTS) {
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      const rest = p.slice(prefix.length);
      const target = resolve(rest);
      if (target && target !== p) return target;
    }
  }

  return null;
}

export function resolveAdminRestaurantPanelAlias(pathname: string): string | null {
  const p = normalizePathname(pathname);
  const exact = ADMIN_RESTAURANT_PANEL_ALIASES[p];
  if (exact) return exact;

  if (p.startsWith("/admin/panel/")) {
    const rest = p.slice("/admin/panel".length);
    if (rest === "/orders" || rest === "/pedidos") return nav.panel();
    if (rest === "/qrcodes" || rest === "/qr-codes" || rest === "/tables") return nav.panel("tables");
    return nav.panel();
  }

  return null;
}

export function customerScreenFromPathname(pathname: string): CustomerRouteAliasScreen | null {
  return CUSTOMER_ROUTE_ALIASES[normalizePathname(pathname)] ?? null;
}

export function resolveCustomerRouteRedirect(pathname: string, search = ""): { pathname: string; search: string } | null {
  const screen = customerScreenFromPathname(pathname);
  if (!screen) return null;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("screen", screen);
  const qs = params.toString();
  return { pathname: nav.home(), search: qs ? `?${qs}` : "" };
}

/** Rotas públicas do cliente (ecrãs internos — não URLs do router). */
export const PUBLIC_CUSTOMER_SCREENS = [
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "home",
  "product",
  "review",
  "payment",
  "confirmation",
  "tracking",
  "account",
] as const;

/** Mapa canónico para documentação e links. */
export const CANONICAL_ROUTES = {
  customerHome: nav.home(),
  customerAuth: nav.auth(),
  restaurantPanel: nav.panel(),
  restaurantOrders: nav.panel(),
  restaurantQrCodes: nav.panel("tables"),
  restaurantCashier: nav.panel("cashier"),
  adminHub: nav.admin(),
  adminMenu: nav.admin("menu"),
  adminFinance: nav.admin("finance"),
  adminSettings: nav.admin("settings"),
  adminBranding: nav.admin("branding"),
  adminOperations: nav.admin("operations"),
} as const;
