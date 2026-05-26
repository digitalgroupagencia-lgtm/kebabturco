/** Resolve chaves Stripe — produção e teste (Lovable Cloud pode usar nomes diferentes). */

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

export function getStripeWebhookSecret(mode: StripeKeyMode = "live"): string | null {
  const names =
    mode === "test"
      ? ["STRIPE_WEBHOOK_SECRET_TEST", "STRIPE_TEST_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET"]
      : ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SIGNING_SECRET"];
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function pickStripeSecretForEnvironment(env: StripeKeyMode): string | null {
  if (env === "test") return getStripeSecretKeyTest() ?? null;
  return getStripeSecretKey();
}
