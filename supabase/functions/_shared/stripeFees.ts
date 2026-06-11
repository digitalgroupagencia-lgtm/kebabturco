/** Taxa fixa da plataforma por pedido online pago com cartão (€1,00). */
export const PLATFORM_FEE_CENTS = 100;

/**
 * Estimativa conservadora cartão UE (1,5% + €0,25).
 * Retida do repasse do restaurante via application_fee_amount (Destination Charge).
 */
export function estimateStripeFeeCents(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return Math.ceil(amountCents * 0.015 + 25);
}

/** Valor do restaurante: produtos + entrega − desconto (sem taxa online). */
export function computeRestaurantPortionCents(
  subtotalCents: number,
  deliveryCents: number,
  discountCents: number,
): number {
  return Math.max(0, subtotalCents + deliveryCents - discountCents);
}

/**
 * Taxa retida do repasse do restaurante (€1 plataforma + estimativa Stripe).
 * O cliente paga apenas o valor dos produtos + entrega − desconto.
 */
export function computeApplicationFeeCents(restaurantPortionCents: number): number {
  if (restaurantPortionCents <= 0) return 0;
  const raw = PLATFORM_FEE_CENTS + estimateStripeFeeCents(restaurantPortionCents);
  const maxFee = Math.max(0, restaurantPortionCents - 1);
  return Math.min(raw, maxFee);
}

/** Alias interno — taxa descontada do restaurante, não cobrada ao cliente. */
export function computeOnlineServiceFeeCents(restaurantPortionCents: number): number {
  return computeApplicationFeeCents(restaurantPortionCents);
}

/** Total cobrado ao cliente = apenas valor do restaurante. */
export function computeCustomerTotalCents(restaurantPortionCents: number): number {
  return restaurantPortionCents;
}

export function estimatedStripeFeeInServiceFee(onlineServiceFeeCents: number): number {
  return Math.max(0, onlineServiceFeeCents - PLATFORM_FEE_CENTS);
}

/** @deprecated Use online_service_fee_cents as customer-facing fee label storage. */
export function computeProcessingFeeCents(platformFeeCents: number, stripeFeeCents: number): number {
  return platformFeeCents + stripeFeeCents;
}

export function computeNetToStoreCents(restaurantPortionCents: number): number {
  return Math.max(0, restaurantPortionCents - computeApplicationFeeCents(restaurantPortionCents));
}
