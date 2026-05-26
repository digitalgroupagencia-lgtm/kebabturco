import { SINGLE_TENANT_MODE } from "@/lib/appMode";

/**
 * Chave publicável Stripe — Kebab Turco produção.
 * Segura no browser (pk_live). Preferir variável VITE_STRIPE_PUBLISHABLE_KEY na Lovable se disponível.
 */
const KEBAB_TURCO_STRIPE_PUBLISHABLE_FALLBACK = SINGLE_TENANT_MODE
  ? "pk_live_51R9ZJLGdymad9Lk9B5XUkb4FcdewOt7PCavKpGl6pitpYf0QngWoO4EBsBMKQAv8CeGZflC0BdqP3mgYSVPm6gb0004WMwRvvV"
  : "";

const ENV_CANDIDATES = [
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_STRIPE_PUBLIC_KEY",
  "VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PUBLISHABLE_KEY",
] as const;

const TEST_ENV_CANDIDATES = [
  "VITE_STRIPE_PUBLISHABLE_KEY_TEST",
  "VITE_STRIPE_TEST_PUBLISHABLE_KEY",
  "VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST",
] as const;

export type StripePublishableEnvironment = "live" | "test";

function readEnvKey(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === "string" && v.trim().startsWith("pk_") ? v.trim() : "";
}

function readLiveKeyFromEnv(): string {
  for (const name of ENV_CANDIDATES) {
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
  for (const name of ENV_CANDIDATES) {
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
    return readTestKeyFromEnv();
  }
  return readLiveKeyFromEnv() || KEBAB_TURCO_STRIPE_PUBLISHABLE_FALLBACK;
}

/** Chave publicável activa (variável de ambiente ou fallback Kebab Turco). */
export function getStripePublishableKey(): string {
  return getStripePublishableKeyForEnvironment("live");
}

export function hasStripePublishableKey(environment: StripePublishableEnvironment = "live"): boolean {
  return getStripePublishableKeyForEnvironment(environment).length > 0;
}

export function stripePublishableKeySource(): "env" | "fallback" | "none" {
  if (readLiveKeyFromEnv()) return "env";
  if (KEBAB_TURCO_STRIPE_PUBLISHABLE_FALLBACK) return "fallback";
  return "none";
}
