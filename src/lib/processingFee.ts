/**
 * Espelho da lógica de taxas do servidor — apenas para ecrãs (checkout e admin).
 * Autoritativo: supabase/functions/_shared/stripeFees.ts
 *
 * Regra: o cliente paga só produtos + entrega − desconto.
 * A taxa da plataforma sai do repasse do restaurante.
 */
export const PLATFORM_FEE_EUR = 1;

export function estimateStripeFeeEur(chargeTotalEur: number): number {
  if (chargeTotalEur <= 0) return 0;
  return Math.ceil((chargeTotalEur * 0.015 + 0.25) * 100) / 100;
}

export function computeRestaurantPortionEur(subtotal: number, delivery: number, discount: number): number {
  return Math.max(0, Math.round((subtotal + delivery - discount) * 100) / 100);
}

/** Taxa retida do restaurante (não aparece no total do cliente). */
export function computePlatformDeductionEur(restaurantPortionEur: number): number {
  if (restaurantPortionEur <= 0) return 0;
  const portionCents = Math.round(restaurantPortionEur * 100);
  const rawCents = 100 + Math.ceil(portionCents * 0.015 + 25);
  const maxCents = Math.max(0, portionCents - 1);
  return Math.min(rawCents, maxCents) / 100;
}

/** @deprecated Use computePlatformDeductionEur — mantido para compatibilidade interna */
export function computeOnlineServiceFeeEur(restaurantPortionEur: number): number {
  return computePlatformDeductionEur(restaurantPortionEur);
}

/** Total cobrado ao cliente = apenas valor do restaurante. */
export function computeCustomerTotalEur(restaurantPortionEur: number): number {
  return restaurantPortionEur;
}

/** @deprecated Prefer computePlatformDeductionEur */
export function estimateProcessingFeeEur(restaurantPortionEur: number): number {
  return computePlatformDeductionEur(restaurantPortionEur);
}

export const ONLINE_SERVICE_FEE_LABEL = "Taxa de serviço online";

export function formatOnlineServiceFeeLabel(feeEur: number): string {
  return `${ONLINE_SERVICE_FEE_LABEL}: ${feeEur.toFixed(2)}€`;
}
