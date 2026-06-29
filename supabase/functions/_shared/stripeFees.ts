/** Pedidos abaixo de €10 — taxa reduzida da plataforma. */
export const PLATFORM_FEE_THRESHOLD_CENTS = 1000;
export const PLATFORM_FEE_SMALL_CENTS = 50;
export const PLATFORM_FEE_STANDARD_CENTS = 100;

/** Compat — taxa máxima da plataforma por pedido (≥ €10). */
export const PLATFORM_FEE_CENTS = PLATFORM_FEE_STANDARD_CENTS;

/**
 * Taxa fixa da plataforma por pedido online (só Euro Business Food — não inclui Stripe).
 * < €10 → €0,50 · ≥ €10 → €1,00
 */
export function computePlatformFeeCents(restaurantPortionCents: number): number {
  if (restaurantPortionCents <= 0) return 0;
  return restaurantPortionCents < PLATFORM_FEE_THRESHOLD_CENTS
    ? PLATFORM_FEE_SMALL_CENTS
    : PLATFORM_FEE_STANDARD_CENTS;
}

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
 * Taxa retida do repasse do restaurante (taxa plataforma + estimativa Stripe).
 * O cliente paga apenas o valor dos produtos + entrega − desconto.
 */
export function computeApplicationFeeCents(restaurantPortionCents: number): number {
  if (restaurantPortionCents <= 0) return 0;
  const platformFee = computePlatformFeeCents(restaurantPortionCents);
  const raw = platformFee + estimateStripeFeeCents(restaurantPortionCents);
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

export function estimatedStripeFeeInServiceFee(
  onlineServiceFeeCents: number,
  restaurantPortionCents?: number,
): number {
  const platformFee =
    restaurantPortionCents != null && restaurantPortionCents > 0
      ? computePlatformFeeCents(restaurantPortionCents)
      : PLATFORM_FEE_STANDARD_CENTS;
  return Math.max(0, onlineServiceFeeCents - platformFee);
}

/** @deprecated Use online_service_fee_cents as customer-facing fee label storage. */
export function computeProcessingFeeCents(platformFeeCents: number, stripeFeeCents: number): number {
  return platformFeeCents + stripeFeeCents;
}

export function computeNetToStoreCents(restaurantPortionCents: number): number {
  return Math.max(0, restaurantPortionCents - computeApplicationFeeCents(restaurantPortionCents));
}
