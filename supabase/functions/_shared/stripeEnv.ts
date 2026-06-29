import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

/** Resolve chaves Stripe, produção e teste (Lovable Cloud pode usar nomes diferentes). */

export type StripeKeyMode = "live" | "test";

export function stripeKeyMode(secretKey: string): StripeKeyMode {
  return secretKey.startsWith("sk_test") ? "test" : "live";
}

export function getStripeSecretKey(): string | null {
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_SECRET", "STRIPE_SK"]) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function getStripeSecretKeyTest(): string | null {
  for (const name of [
    "STRIPE_SECRET_KEY_TEST",
    "STRIPE_TEST_SECRET_KEY",
    "STRIPE_SK_TEST",
    "STRIPE_SECRET_KEY_SANDBOX",
  ]) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

const WEBHOOK_SECRET_NAMES: Record<StripeKeyMode, string[]> = {
  live: ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SIGNING_SECRET"],
  test: [
    "STRIPE_WEBHOOK_SECRET_TEST",
    "STRIPE_WEBHOOK_SECRET_TEST_MINIMAL",
    "STRIPE_TEST_WEBHOOK_SECRET",
  ],
};

/** Todos os segredos de webhook configurados para o modo (ex.: teste + teste minimal). */
export function getStripeWebhookSecretCandidates(mode: StripeKeyMode = "live"): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of WEBHOOK_SECRET_NAMES[mode]) {
    const value = Deno.env.get(name)?.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

export function getStripeWebhookSecret(mode: StripeKeyMode = "live"): string | null {
  return getStripeWebhookSecretCandidates(mode)[0] ?? null;
}

export function pickStripeSecretForEnvironment(env: StripeKeyMode): string | null {
  if (env === "test") return getStripeSecretKeyTest() ?? null;
  return getStripeSecretKey();
}

export function getStripePublishableKey(mode: StripeKeyMode): string | null {
  const names = mode === "test"
    ? [
        "STRIPE_PUBLISHABLE_KEY_TEST",
        "VITE_STRIPE_PUBLISHABLE_KEY_TEST",
        "STRIPE_TEST_PUBLISHABLE_KEY",
        "STRIPE_PUBLIC_KEY_TEST",
      ]
    : [
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PUBLISHABLE_KEY_LIVE",
        "VITE_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PUBLIC_KEY",
      ];
  const expected = mode === "test" ? "pk_test_" : "pk_live_";
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value?.startsWith(expected)) return value;
  }
  return null;
}

export function hasAnyStripeWebhookSecret(): boolean {
  return (
    getStripeWebhookSecretCandidates("live").length > 0 ||
    getStripeWebhookSecretCandidates("test").length > 0
  );
}

/** Recupera PaymentIntent tentando o ambiente preferido e depois o alternativo. */
export async function retrievePaymentIntentWithFallback(
  paymentIntentId: string,
  preferredMode: StripeKeyMode = "live",
): Promise<{ stripe: Stripe; pi: Stripe.PaymentIntent; mode: StripeKeyMode }> {
  const order: StripeKeyMode[] =
    preferredMode === "test" ? ["test", "live"] : ["live", "test"];

  let lastError: unknown;
  for (const mode of order) {
    const secret = pickStripeSecretForEnvironment(mode);
    if (!secret) continue;
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      return { stripe, pi, mode };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Pagamento não encontrado");
}
