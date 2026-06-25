/** Segmentos reservados, não são slugs de restaurante na URL. */
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
  "ligar-conta",
  "recibos",
  "kds",
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
  if (pathname.startsWith("/staff")) return "/staff";
  if (pathname.startsWith("/auth")) return "/staff";
  if (pathname.startsWith("/seller")) return "/seller";
  if (pathname.startsWith("/delivery")) return "/delivery";
  return "/";
}

/** Converte caminho quebrado do editor para pathname real (sem parâmetros de aviso). */
export function fixBrokenEditorLocation(pathname: string): { pathname: string; search: string } {
  return { pathname: fixBrokenEditorPath(pathname), search: "" };
}
