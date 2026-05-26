import type { MenuProduct } from "@/hooks/useMenuData";
import { isClosedProteinCombo, inferComboUnitCount, productDescriptionText, productText } from "./comboProductRules";

export type ProductClassification = {
  productType: "simple" | "combo";
  comboUnitCount: number;
};

/** Infer unit count from name when BD field is empty (fallback only). */
export function inferComboUnitCountFromName(product: MenuProduct): number {
  if (product.comboUnitCount && product.comboUnitCount > 0) return product.comboUnitCount;
  const text = productText(product);
  const match = text.match(/\b(\d+)\s*(?:pan\s*)?(pita|pitas|rollo|rollos|pizza|pizzas)\b/i);
  if (match) return Math.max(2, Number(match[1]) || 2);
  return 0;
}

function categoryHintsCombo(categorySlug: string): boolean {
  const slug = categorySlug.toLowerCase();
  return /ofertas-combo|combo|menus|menús|menús|menu/.test(slug);
}

/**
 * Prioridade: BD (product_type, combo_unit_count) → categoria → descrição → nome.
 */
export function normalizeProductClassification(product: MenuProduct): ProductClassification {
  const name = productText(product);
  const desc = productDescriptionText(product);
  const cat = (product.categorySlug || "").toLowerCase();

  if (product.productType === "combo") {
    const count =
      product.comboUnitCount && product.comboUnitCount > 0
        ? product.comboUnitCount
        : inferComboUnitCountFromName(product);
    return { productType: "combo", comboUnitCount: count };
  }

  if (product.comboUnitCount && product.comboUnitCount > 1) {
    return { productType: "combo", comboUnitCount: product.comboUnitCount };
  }

  if (categoryHintsCombo(cat)) {
    return {
      productType: "combo",
      comboUnitCount: inferComboUnitCountFromName(product),
    };
  }

  if (/\bmenú\b|\bmenu\b/i.test(name)) {
    return { productType: "combo", comboUnitCount: 0 };
  }

  if (/^combo\s/i.test(name)) {
    return {
      productType: "combo",
      comboUnitCount: inferComboUnitCountFromName(product),
    };
  }

  if (
    isClosedProteinCombo(product) &&
    /bebida|refresco|2l|2 l|lata|33cl|33 cl|coca/i.test(desc)
  ) {
    return { productType: "combo", comboUnitCount: 0 };
  }

  const inferredUnits = inferComboUnitCountFromName(product);
  if (inferredUnits > 1) {
    return { productType: "combo", comboUnitCount: inferredUnits };
  }

  return { productType: "simple", comboUnitCount: 0 };
}

export function resolveIsComboProduct(product: MenuProduct): boolean {
  return normalizeProductClassification(product).productType === "combo";
}

export function descriptionIncludesDrink(product: MenuProduct): boolean {
  return /bebida|refresco|2l|2 l|lata|33cl|33 cl|coca|sprite|fanta|nestea|aquarius|agua/i.test(
    productDescriptionText(product),
  );
}
