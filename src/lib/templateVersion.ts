/**
 * Master Template Version
 * ───────────────────────
 * Identifica esta versão do código-fonte do Master Template.
 * Incrementar a cada release significativo do Master.
 *
 * Comparar com a tabela `_template_version` no banco para detectar
 * restaurantes desatualizados.
 */
export const TEMPLATE_VERSION = "1.0.0" as const;

export const TEMPLATE_CODENAME = "Kebab Master" as const;

export const TEMPLATE_RELEASED_AT = "2026-06-04" as const;

/**
 * Compara duas versões semver (major.minor.patch).
 * Retorna -1 se a < b, 0 se iguais, 1 se a > b.
 */
export function compareTemplateVersion(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
