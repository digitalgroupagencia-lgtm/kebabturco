/**
 * Feature flags internas (Fase 5).
 *
 * Qualquer módulo interno NOVO (admin, painel, diagnóstico, ferramenta
 * experimental) deve ficar atrás de uma flag aqui e começar DESLIGADO.
 *
 * Regras:
 *   1. Nada experimental pode carregar no cardápio do cliente.
 *   2. A flag só pode ser lida em código interno (admin/panel/seller/etc.).
 *      O smoke test continua a bloquear imports do cliente para zonas internas.
 *   3. Para activar globalmente, mudar `defaultEnabled` aqui (commit revisto).
 *   4. Para activar por tenant, usar a coluna `tenant_has_feature` no DB ou
 *      o override em `localStorage` (chave `internal-flag:<key>`), apenas em
 *      ambiente de dev/QA.
 */

export type InternalFeatureKey =
  // exemplo, adicionar novas aqui
  | "experimental_admin_metrics"
  | "experimental_kitchen_v2";

type FlagDef = {
  defaultEnabled: boolean;
  description: string;
};

const REGISTRY: Record<InternalFeatureKey, FlagDef> = {
  experimental_admin_metrics: {
    defaultEnabled: false,
    description: "Métricas avançadas no AdminDashboard (em desenvolvimento).",
  },
  experimental_kitchen_v2: {
    defaultEnabled: false,
    description: "Nova vista de cozinha (em testes internos).",
  },
};

const LS_PREFIX = "internal-flag:";

export function isInternalFeatureEnabled(key: InternalFeatureKey): boolean {
  const def = REGISTRY[key];
  if (!def) return false;
  try {
    const override = localStorage.getItem(LS_PREFIX + key);
    if (override === "1") return true;
    if (override === "0") return false;
  } catch {
    /* ignore */
  }
  return def.defaultEnabled;
}

export function setInternalFeatureOverride(
  key: InternalFeatureKey,
  enabled: boolean | null,
) {
  try {
    if (enabled === null) localStorage.removeItem(LS_PREFIX + key);
    else localStorage.setItem(LS_PREFIX + key, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function listInternalFeatures(): Array<{ key: InternalFeatureKey } & FlagDef> {
  return (Object.keys(REGISTRY) as InternalFeatureKey[]).map((key) => ({
    key,
    ...REGISTRY[key],
  }));
}
