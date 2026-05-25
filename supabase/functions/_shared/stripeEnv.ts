/** Resolve chave secreta Stripe — Lovable Cloud pode usar nomes diferentes. */
export function getStripeSecretKey(): string | null {
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_SECRET", "STRIPE_SK"]) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function getStripeWebhookSecret(): string | null {
  for (const name of ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SIGNING_SECRET"]) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}
