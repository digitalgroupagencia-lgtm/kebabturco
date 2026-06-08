/**
 * Stripe publishable keys (pk_*) — modo SaaS multi-tenant.
 *
 * Sem chaves hardcoded. A chave activa vem de:
 * 1. `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY*` (build-time)
 * 2. Configuração por tenant em `store_payment_gateways` (resolvida noutro
 *    fluxo — não aqui).
 *
 * Estes exports permanecem por compatibilidade de imports antigos e são
 * sempre string vazia. Não voltar a colocar chaves de um restaurante neste
 * ficheiro — chaves por tenant vivem na DB.
 * @deprecated usar `getStripePublishableKey()` / `getStripePublishableKeyForEnvironment()`
 */
export const KEBAB_TURCO_STRIPE_PUBLISHABLE_LIVE = "";
/** @deprecated ver acima. */
export const KEBAB_TURCO_STRIPE_PUBLISHABLE_TEST = "";

export type StripePublishableEnvironment = "live" | "test";

const LIVE_ENV_CANDIDATES = [
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_STRIPE_PUBLIC_KEY",
  "VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PUBLISHABLE_KEY",
] as const;

const TEST_ENV_CANDIDATES = ["VITE_STRIPE_PUBLISHABLE_KEY_TEST"] as const;

function readEnvKey(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === "string" && v.trim().startsWith("pk_") ? v.trim() : "";
}

function readLiveKeyFromEnv(): string {
  for (const name of LIVE_ENV_CANDIDATES) {
    const v = readEnvKey(name);
    if (v && !v.includes("_test_")) return v;
  }
  return "";
}

function readTestKeyFromEnv(): string {
  for (const name of TEST_ENV_CANDIDATES) {
    const v = readEnvKey(name);
    if (v) return v;
  }
  for (const name of LIVE_ENV_CANDIDATES) {
    const v = readEnvKey(name);
    if (v.includes("_test_")) return v;
  }
  return "";
}

/** Chave publicável para o ambiente pedido (live ou teste). */
export function getStripePublishableKeyForEnvironment(
  environment: StripePublishableEnvironment = "live",
): string {
  if (environment === "test") {
    return readTestKeyFromEnv() || KEBAB_TURCO_STRIPE_PUBLISHABLE_TEST;
  }
  return readLiveKeyFromEnv() || KEBAB_TURCO_STRIPE_PUBLISHABLE_LIVE;
}

/** Chave publicável live activa. */
export function getStripePublishableKey(): string {
  return getStripePublishableKeyForEnvironment("live");
}

export function hasStripePublishableKey(environment: StripePublishableEnvironment = "live"): boolean {
  return getStripePublishableKeyForEnvironment(environment).length > 0;
}

export function stripePublishableKeySource(): "env" | "fallback" | "none" {
  if (readLiveKeyFromEnv()) return "env";
  if (KEBAB_TURCO_STRIPE_PUBLISHABLE_LIVE) return "fallback";
  return "none";
}

export function stripePublishableTestKeySource(): "env" | "fallback" | "none" {
  if (readTestKeyFromEnv()) return "env";
  if (KEBAB_TURCO_STRIPE_PUBLISHABLE_TEST) return "fallback";
  return "none";
}
