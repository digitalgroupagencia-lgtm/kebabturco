/**
 * Espelho da lógica de taxas do servidor — apenas para ecrãs (checkout e admin).
 * Autoritativo: supabase/functions/_shared/stripeFees.ts
 */
export const PLATFORM_FEE_EUR = 1;

export function estimateStripeFeeEur(chargeTotalEur: number): number {
  if (chargeTotalEur <= 0) return 0;
  return Math.ceil((chargeTotalEur * 0.015 + 0.25) * 100) / 100;
}

export function computeRestaurantPortionEur(subtotal: number, delivery: number, discount: number): number {
  return Math.max(0, Math.round((subtotal + delivery - discount) * 100) / 100);
}

export function computeOnlineServiceFeeEur(restaurantPortionEur: number): number {
  if (restaurantPortionEur <= 0) return 0;
  const portionCents = Math.round(restaurantPortionEur * 100);
  let feeCents = 100 + Math.ceil(portionCents * 0.015 + 25);
  for (let i = 0; i < 5; i++) {
    feeCents = 100 + Math.ceil((portionCents + feeCents) * 0.015 + 25);
  }
  return feeCents / 100;
}

export function computeCustomerTotalEur(restaurantPortionEur: number): number {
  return Math.round((restaurantPortionEur + computeOnlineServiceFeeEur(restaurantPortionEur)) * 100) / 100;
}

/** @deprecated Prefer computeOnlineServiceFeeEur */
export function estimateProcessingFeeEur(restaurantPortionEur: number): number {
  return computeOnlineServiceFeeEur(restaurantPortionEur);
}

export const ONLINE_SERVICE_FEE_LABEL = "Taxa de serviço online";

export function formatOnlineServiceFeeLabel(feeEur: number): string {
  return `${ONLINE_SERVICE_FEE_LABEL}: ${feeEur.toFixed(2)}€`;
}
