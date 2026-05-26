import type { MenuProduct } from "@/hooks/useMenuData";
import type { ProductModifierConfig } from "./types";
import { hasFixedProtein } from "./comboProductRules";
import { applyComboDescriptionRules } from "./comboConfigFilter";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";
import { filterProductModifierConfig } from "./proteinRules";

export function safeHasFixedProtein(product: MenuProduct): boolean {
  try {
    return hasFixedProtein(product);
  } catch (err) {
    console.error("[safeHasFixedProtein]", product.id, err);
    return false;
  }
}

export function safeSynthesizeModifierConfig(
  product: MenuProduct,
  menuProducts: MenuProduct[] = [],
): ProductModifierConfig | null {
  try {
    const synthesized = synthesizeModifierConfigFromProduct(product, menuProducts);
    if (!synthesized) return null;
    const filtered = filterProductModifierConfig(product, synthesized);
    return applyComboDescriptionRules(product, filtered, menuProducts);
  } catch (err) {
    console.error("[safeSynthesizeModifierConfig]", product.id, err);
    return null;
  }
}
