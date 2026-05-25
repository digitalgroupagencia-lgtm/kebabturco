/** Segmentos reservados — não são slugs de restaurante na URL. */
export const RESERVED_APP_PATHS = new Set([
  "admin",
  "panel",
  "auth",
  "install",
  "seller",
  "cashier",
  "preview",
]);

export function isReservedAppPath(segment: string | null | undefined): boolean {
  if (!segment) return false;
  return RESERVED_APP_PATHS.has(segment.toLowerCase());
}

/** Caminhos inválidos no selector de rotas do editor (ex.: /admin/* literal). */
export function isBrokenEditorPath(pathname: string): boolean {
  return pathname.includes("*");
}
