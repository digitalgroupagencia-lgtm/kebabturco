import type { ProductType } from "./types";

/** Decide se o produto usa o assistente passo-a-passo (totem) em vez de scroll único. */
export function shouldUseCustomizationStepWizard(
  productType: ProductType,
  globalGroupCount: number,
  isMultiUnit: boolean,
): boolean {
  if (isMultiUnit) return true;
  if (globalGroupCount >= 2) return true;
  if (productType === "combo" && globalGroupCount >= 1) return true;
  return false;
}
