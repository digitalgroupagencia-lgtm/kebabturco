import type { ModifierSelection } from "./types";

export function selectionsPriceTotal(selections: ModifierSelection[]): number {
  return selections.reduce((sum, s) => sum + s.priceDelta * s.quantity, 0);
}

export function computeUnitPrice(basePrice: number, sizeAdd: number, selections: ModifierSelection[]): number {
  return basePrice + sizeAdd + selectionsPriceTotal(selections);
}
