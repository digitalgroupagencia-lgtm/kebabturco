import type { MenuProduct } from "@/hooks/useMenuData";
import type { Variant } from "@/data/products";
import type { ModifierGroup, ProductModifierConfig } from "./types";
import {
  detectFixedProtein,
  hasFixedProtein,
  isClosedProteinCombo,
  isVariableProteinProduct,
} from "./comboProductRules";
import { isDrinkProduct } from "./drinkProduct";
import { inferVariantsFromText } from "@/lib/parseProductCustomization";

export type { FixedProtein } from "./comboProductRules";
export {
  detectFixedProtein,
  hasFixedProtein,
  isVariableProteinProduct,
} from "./comboProductRules";

const MEAT_OPTION_RE = /pollo|ternera|mixto|chicken|beef|frango|vaca|viande|poulet|bœuf/i;

export function isMeatChoiceGroup(group: ModifierGroup): boolean {
  if (group.groupKind !== "choice") return false;
  const label = `${group.name.es} ${group.name.pt} ${group.name.en}`.toLowerCase();
  if (/carne|meat|viande|prote[ií]na|elige la carne|escolhe a carne|choose meat/i.test(label)) return true;

  const options = group.options ?? [];
  if (options.length < 2) return false;
  const meatHits = options.filter((o) => MEAT_OPTION_RE.test(`${o.name.es} ${o.name.pt} ${o.name.en}`));
  return meatHits.length >= 2 && meatHits.length === options.length;
}

export function filterIncoherentGroups(product: MenuProduct, groups: ModifierGroup[]): ModifierGroup[] {
  const fixed = hasFixedProtein(product);
  const closed = isClosedProteinCombo(product);
  if (!fixed && !closed) return groups;

  return groups.filter((g) => {
    if (isMeatChoiceGroup(g)) return false;
    if (closed && g.groupKind === "removal" && g.repeatPerUnit) return false;
    return true;
  });
}

export function filterProductModifierConfig(
  product: MenuProduct,
  config: ProductModifierConfig,
): ProductModifierConfig {
  const groups = filterIncoherentGroups(product, config.groups ?? []);
  return {
    ...config,
    groups,
    hasStructuredModifiers: groups.length > 0,
  };
}

export function resolveCustomerVariants(
  product: MenuProduct,
  descriptionText: string,
  nameText: string,
): Variant[] {
  if (hasFixedProtein(product) || isDrinkProduct(product)) return [];
  if (product.variants?.length) return product.variants;

  const meat = inferVariantsFromText(descriptionText) || inferVariantsFromText(nameText);
  if (meat.length >= 2) return meat;

  if (isVariableProteinProduct(product)) {
    return [
      { id: "pollo", name: { es: "Pollo", pt: "Frango", en: "Chicken", fr: "Poulet" } },
      { id: "ternera", name: { es: "Ternera", pt: "Vaca", en: "Beef", fr: "Bœuf" } },
      { id: "mixto", name: { es: "Mixto", pt: "Mixto", en: "Mixed", fr: "Mixte" } },
    ];
  }

  return [];
}
