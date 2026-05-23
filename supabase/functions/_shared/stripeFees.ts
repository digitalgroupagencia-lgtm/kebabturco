/** Platform fixed fee in cents (€1.00) */
export const PLATFORM_FEE_CENTS = 100;

/**
 * Conservative EU card estimate (1.5% + €0.25) until balance_transaction confirms actual fee.
 * Slightly over-estimates so application_fee covers Stripe costs on platform account.
 */
export function estimateStripeFeeCents(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return Math.ceil(amountCents * 0.015 + 25);
}

export function computeApplicationFeeCents(amountCents: number): number {
  return PLATFORM_FEE_CENTS + estimateStripeFeeCents(amountCents);
}

export function computeProcessingFeeCents(platformFeeCents: number, stripeFeeCents: number): number {
  return platformFeeCents + stripeFeeCents;
}

export function computeNetToStoreCents(grossCents: number, processingFeeCents: number): number {
  return Math.max(0, grossCents - processingFeeCents);
}
