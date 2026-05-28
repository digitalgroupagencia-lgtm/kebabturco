/** Segmentos reservados — não são slugs de restaurante na URL. */
export const RESERVED_APP_PATHS = new Set([
  "admin",
  "panel",
  "auth",
  "install",
  "seller",
  "cashier",
  "delivery",
  "staff",
  "equipe",
  "preview",
  "privacy",
  "terms",
  "delete-account",
  "support",
]);

export function isReservedAppPath(segment: string | null | undefined): boolean {
  if (!segment) return false;
  return RESERVED_APP_PATHS.has(segment.toLowerCase());
}

/** Caminhos inválidos no selector de rotas do editor (ex.: /admin/* literal). */
export function isBrokenEditorPath(pathname: string): boolean {
  return pathname.includes("*");
}

/** Converte caminho quebrado do editor para pathname real. */
export function fixBrokenEditorPath(pathname: string): string {
  if (!pathname.includes("*")) return pathname;
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/panel")) return "/panel";
  if (pathname.startsWith("/auth")) return "/auth";
  if (pathname.startsWith("/seller")) return "/seller";
  if (pathname.startsWith("/delivery")) return "/delivery";
  return "/";
}

/** Destino completo com aviso quando wildcard veio do preview Lovable. */
export function fixBrokenEditorLocation(pathname: string): { pathname: string; search: string } {
  const fixed = fixBrokenEditorPath(pathname);
  if (!pathname.includes("*")) return { pathname, search: "" };
  const hint = "routeHint=lovable-wildcard";
  if (fixed === "/admin") return { pathname: fixed, search: `?${hint}` };
  return { pathname: fixed, search: "" };
}
