/** Caminhos URL partilhados — sem importar páginas do painel (evita crash no /panel/live). */

export function joinPath(...segments: string[]): string {
  return `/${segments.filter(Boolean).join("/")}`;
}

export const nav = {
  home: () => joinPath(),
  staff: () => joinPath("staff"),
  /** Único login, alias legado para links antigos /auth. */
  auth: () => joinPath("staff"),
  install: () => joinPath("install"),
  cashier: () => joinPath("cashier"),
  panel: (...rest: string[]) => joinPath("panel", ...rest),
  admin: (...rest: string[]) => joinPath("admin", ...rest),
  seller: (...rest: string[]) => joinPath("seller", ...rest),
  delivery: (...rest: string[]) => joinPath("delivery", ...rest),
  privacy: () => joinPath("privacy"),
  terms: () => joinPath("terms"),
  deleteAccount: () => joinPath("delete-account"),
  support: () => joinPath("support"),
} as const;

/** Lista curada, dropdown preview Lovable (só loja + login). */
export const LOVABLE_PREVIEW_PATHS = ["/", "/staff"] as const;

const PREVIEW_PATH_SET = new Set<string>(LOVABLE_PREVIEW_PATHS);

export function isPreviewListedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return PREVIEW_PATH_SET.has(p);
}
