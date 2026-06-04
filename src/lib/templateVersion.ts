/**
 * Master Template Version
 * ───────────────────────
 * Identifica esta versão do código-fonte do Master Template.
 * Incrementar a cada release significativo.
 */
export const TEMPLATE_VERSION = "1.1.1" as const;

export const TEMPLATE_CODENAME = "Kebab Master" as const;

export const TEMPLATE_RELEASED_AT = "2026-06-04" as const;

/** Compara semver. -1 se a<b, 0 se iguais, 1 se a>b. */
export function compareTemplateVersion(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

export type TemplateStatusKind =
  | "up_to_date"
  | "db_outdated"
  | "code_outdated"
  | "bootstrap_missing";

export interface TemplateStatus {
  kind: TemplateStatusKind;
  label: string;
  detail: string;
  codeVersion: string;
  dbVersion: string | null;
  dbAppliedAt: string | null;
}

export function diagnoseTemplateStatus(
  dbVersion: string | null,
  dbAppliedAt: string | null,
): TemplateStatus {
  const code = TEMPLATE_VERSION;
  if (!dbVersion) {
    return {
      kind: "bootstrap_missing",
      label: "Bootstrap não aplicado",
      detail: "Rode supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql neste projeto.",
      codeVersion: code,
      dbVersion: null,
      dbAppliedAt: null,
    };
  }
  const cmp = compareTemplateVersion(code, dbVersion);
  if (cmp === 0) {
    return {
      kind: "up_to_date",
      label: "Projeto atualizado",
      detail: `Código e banco em ${code}.`,
      codeVersion: code,
      dbVersion,
      dbAppliedAt,
    };
  }
  if (cmp > 0) {
    return {
      kind: "db_outdated",
      label: "Existem migrations pendentes",
      detail: `Código em ${code}, banco em ${dbVersion}. Aplique as migrations novas.`,
      codeVersion: code,
      dbVersion,
      dbAppliedAt,
    };
  }
  return {
    kind: "code_outdated",
    label: "Código desatualizado",
    detail: `Banco em ${dbVersion}, código em ${code}. Faça git pull do Master.`,
    codeVersion: code,
    dbVersion,
    dbAppliedAt,
  };
}
