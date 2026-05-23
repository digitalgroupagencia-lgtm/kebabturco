/** Mirrors server fee logic for display-only estimates in the panel. */
export const PLATFORM_FEE_EUR = 1;

export function estimateStripeFeeEur(orderTotalEur: number): number {
  if (orderTotalEur <= 0) return 0;
  return Math.ceil((orderTotalEur * 0.015 + 0.25) * 100) / 100;
}

export function estimateProcessingFeeEur(orderTotalEur: number): number {
  return Math.round((PLATFORM_FEE_EUR + estimateStripeFeeEur(orderTotalEur)) * 100) / 100;
}

export function formatProcessingFeeLabel(feeEur: number): string {
  return `Taxa processamento online: ${feeEur.toFixed(2)}€`;
}
