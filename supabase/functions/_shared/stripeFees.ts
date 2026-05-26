/** Taxa fixa da plataforma por pedido online pago com cartão (€1,00). */
export const PLATFORM_FEE_CENTS = 100;

/**
 * Estimativa conservadora cartão UE (1,5% + €0,25).
 * Incluída na taxa de serviço online cobrada ao cliente.
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
 * Taxa de serviço/pagamento online cobrada ao cliente.
 * Contém €1 plataforma + cobertura estimada da taxa Stripe sobre o total cobrado.
 */
export function computeOnlineServiceFeeCents(restaurantPortionCents: number): number {
  if (restaurantPortionCents <= 0) return 0;
  let fee = PLATFORM_FEE_CENTS + estimateStripeFeeCents(restaurantPortionCents + PLATFORM_FEE_CENTS);
  for (let i = 0; i < 5; i++) {
    fee = PLATFORM_FEE_CENTS + estimateStripeFeeCents(restaurantPortionCents + fee);
  }
  return fee;
}

export function computeCustomerTotalCents(restaurantPortionCents: number): number {
  return restaurantPortionCents + computeOnlineServiceFeeCents(restaurantPortionCents);
}

/** application_fee_amount = taxa online inteira (plataforma retém; Stripe sai daqui). */
export function computeApplicationFeeCents(restaurantPortionCents: number): number {
  return computeOnlineServiceFeeCents(restaurantPortionCents);
}

export function estimatedStripeFeeInServiceFee(onlineServiceFeeCents: number): number {
  return Math.max(0, onlineServiceFeeCents - PLATFORM_FEE_CENTS);
}

/** @deprecated Use online_service_fee_cents as customer-facing fee label storage. */
export function computeProcessingFeeCents(platformFeeCents: number, stripeFeeCents: number): number {
  return platformFeeCents + stripeFeeCents;
}

export function computeNetToStoreCents(restaurantPortionCents: number): number {
  return Math.max(0, restaurantPortionCents);
}
