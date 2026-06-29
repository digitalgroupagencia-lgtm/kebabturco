import { SINGLE_TENANT_MODE } from "@/lib/appMode";

/**
 * Chaves publicáveis Stripe, Kebab Turco.
 * Seguras no browser (pk_*). Versionadas no projecto, NÃO em Segredos Lovable.
 *
 * Ordem de leitura:
 * 1. import.meta.env (build injecta config/stripe.public.env)
 * 2. fallback abaixo (mesmo padrão da chave live)
 */
export const KEBAB_TURCO_STRIPE_PUBLISHABLE_LIVE = SINGLE_TENANT_MODE
  ? "pk_live_51Tf14qCbdC0WQ0opjJ5sC2whL8TGC5FEyxMEkPI3h2oi6YofKQsPtHWzCijBEWuNeG9wQEwtr486sERx7iYQsxl000sVK6yd0g"
  : "";

/** pk_test da Stripe, Kebab Turco / Euro Business Food (modo Test). Segura no browser. */
export const KEBAB_TURCO_STRIPE_PUBLISHABLE_TEST = SINGLE_TENANT_MODE
  ? "pk_test_51Tf14qCbdC0WQ0opxNuHTvCWOtk4PI2zMt1Gm44w3BUhDwJfhFHs8lvEgLKpPFRYqA49FroS8hFPTgLjhELFYEyq006ocaeqUm"
  : "";

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
