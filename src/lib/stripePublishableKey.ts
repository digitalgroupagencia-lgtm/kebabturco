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

function readEnvKey(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === "string" && v.trim().startsWith("pk_") ? v.trim() : "";
}

/** Chave publicável activa (variável de ambiente ou fallback Kebab Turco). */
export function getStripePublishableKey(): string {
  for (const name of ENV_CANDIDATES) {
    const v = readEnvKey(name);
    if (v) return v;
  }
  return KEBAB_TURCO_STRIPE_PUBLISHABLE_FALLBACK;
}

export function hasStripePublishableKey(): boolean {
  return getStripePublishableKey().length > 0;
}

export function stripePublishableKeySource(): "env" | "fallback" | "none" {
  for (const name of ENV_CANDIDATES) {
    if (readEnvKey(name)) return "env";
  }
  if (KEBAB_TURCO_STRIPE_PUBLISHABLE_FALLBACK) return "fallback";
  return "none";
}
