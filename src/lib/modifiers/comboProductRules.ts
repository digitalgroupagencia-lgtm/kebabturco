import type { MenuProduct } from "@/hooks/useMenuData";
import type { Variant } from "@/data/products";

export type ComboUnitKind = "pita" | "rollo" | "pizza" | "piece" | null;

const DEFAULT_MEAT_VARIANTS: Variant[] = [
  { id: "pollo", name: { es: "Pollo", pt: "Frango", en: "Chicken", fr: "Poulet" } },
  { id: "ternera", name: { es: "Ternera", pt: "Vaca", en: "Beef", fr: "Bœuf" } },
  { id: "mixto", name: { es: "Mixto", pt: "Mixto", en: "Mixed", fr: "Mixte" } },
];

const DEFAULT_PIZZA_FLAVORS: Variant[] = [
  { id: "kebab", name: { es: "Kebab", pt: "Kebab", en: "Kebab", fr: "Kebab" } },
  { id: "mixta", name: { es: "Mixta", pt: "Mixta", en: "Mixed", fr: "Mixte" } },
  { id: "pollo", name: { es: "Pollo", pt: "Frango", en: "Chicken", fr: "Poulet" } },
  { id: "ternera", name: { es: "Ternera", pt: "Vaca", en: "Beef", fr: "Bœuf" } },
];

export function productText(product: MenuProduct): string {
  return `${product.name?.es || ""} ${product.name?.pt || ""} ${product.name?.en || ""}`.toLowerCase();
}

export function productDescriptionText(product: MenuProduct): string {
  return `${product.description?.es || ""} ${product.description?.pt || ""} ${product.description?.en || ""}`.toLowerCase();
}

/** Combo fechado — proteína já definida no nome (ex.: 10 piezas pollo crispy, 3 pizzas). */
export function isClosedProteinCombo(product: MenuProduct): boolean {
  const text = productText(product);
  if (/piezas?\s|pieza\s|nuggets|alitas|wings|crispy|broaster/i.test(text) && !/pita|rollo|pizza/i.test(text)) {
    return true;
  }
  if (/\d+\s*pizzas?\b/i.test(text)) return true;
  if (/pizzas?\s+kebab|pizza\s+kebab/i.test(text)) return true;
  return false;
}

export function inferComboUnitKind(product: MenuProduct): ComboUnitKind {
  const text = productText(product);
  if (isClosedProteinCombo(product)) return "piece";
  if (/pizza/i.test(text)) return "pizza";
  if (/pan\s*pita|\bpita\b/i.test(text)) return "pita";
  if (/rollo/i.test(text)) return "rollo";
  return null;
}

export function inferComboUnitCount(product: MenuProduct): number {
  if (product.comboUnitCount && product.comboUnitCount > 1) return product.comboUnitCount;
  const text = productText(product);
  if (isClosedProteinCombo(product)) return 0;

  const match = text.match(/\b(\d+)\s*(?:pan\s*)?(pita|pitas|rollo|rollos|pizza|pizzas)\b/i);
  if (match) return Math.max(2, Number(match[1]) || 2);

  return 0;
}

/** Só perguntar carne quando o produto realmente permite variação por unidade. */
export function allowsPerUnitMeatChoice(product: MenuProduct): boolean {
  if (isClosedProteinCombo(product)) return false;
  const kind = inferComboUnitKind(product);
  if (kind !== "pita" && kind !== "rollo") return false;
  const unitCount = inferComboUnitCount(product);
  return unitCount > 1;
}

export function allowsPerUnitPizzaFlavor(product: MenuProduct): boolean {
  if (inferComboUnitKind(product) !== "pizza") return false;
  return inferComboUnitCount(product) > 1;
}

export function perUnitChoiceVariants(product: MenuProduct): Variant[] {
  if (allowsPerUnitPizzaFlavor(product)) {
    return product.variants && product.variants.length >= 2 ? product.variants : DEFAULT_PIZZA_FLAVORS;
  }
  if (allowsPerUnitMeatChoice(product)) {
    return product.variants && product.variants.length >= 2 ? product.variants : DEFAULT_MEAT_VARIANTS;
  }
  return [];
}

export function allowsGlobalMeatChoice(product: MenuProduct): boolean {
  if (isClosedProteinCombo(product)) return false;
  if (allowsPerUnitMeatChoice(product) || allowsPerUnitPizzaFlavor(product)) return false;
  if (product.variants && product.variants.length >= 2) {
    const text = productText(product);
    if (/pizza|piezas?|crispy|bebida|refresco/i.test(text)) return false;
    return true;
  }
  return false;
}

export function allowsIngredientRemoval(product: MenuProduct): boolean {
  if (isClosedProteinCombo(product)) return false;
  const kind = inferComboUnitKind(product);
  return kind === "pita" || kind === "rollo" || kind === null;
}

export function productIncludesPotato(product: MenuProduct): boolean {
  const blob = `${productText(product)} ${productDescriptionText(product)}`;
  return /patata|batata|fritas|fries/i.test(blob);
}

const ORDINAL_ES = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª", "9ª", "10ª"];
const ORDINAL_PT = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª", "9ª", "10ª"];

export function comboUnitStepTitle(
  product: MenuProduct,
  unitIndex: number,
  groupKind?: string,
): Record<string, string> {
  const kind = inferComboUnitKind(product);
  const n = unitIndex + 1;
  const ordEs = ORDINAL_ES[unitIndex] || `${n}ª`;
  const ordPt = ORDINAL_PT[unitIndex] || `${n}ª`;

  if (kind === "pizza" || groupKind === "pizza-flavor") {
    return {
      es: `Elige el sabor de la ${ordEs} pizza`,
      pt: `Escolhe o sabor da ${ordPt} pizza`,
      en: `Choose the ${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} pizza flavor`,
      fr: `Choisissez la ${ordEs} pizza`,
    };
  }

  if (kind === "pita") {
    return {
      es: `Elige la carne del ${n}º pan pita`,
      pt: `Escolhe a carne do ${n}º pan pita`,
      en: `Choose meat for pan pita ${n}`,
      fr: `Choisissez la viande du ${n}º pan pita`,
    };
  }

  if (kind === "rollo") {
    return {
      es: `Elige la carne del ${n}º rollo`,
      pt: `Escolhe a carne do ${n}º rollo`,
      en: `Choose meat for roll ${n}`,
      fr: `Choisissez la viande du ${n}º rollo`,
    };
  }

  const base = product.unitLabel?.es || product.unitLabel?.pt || "Unidad";
  return {
    es: `${base} ${n}`,
    pt: `${product.unitLabel?.pt || "Unidade"} ${n}`,
    en: `${product.unitLabel?.en || "Unit"} ${n}`,
    fr: `${product.unitLabel?.fr || "Unité"} ${n}`,
  };
}

export function perUnitChoiceGroupName(product: MenuProduct): Record<string, string> {
  const kind = inferComboUnitKind(product);
  if (kind === "pizza") {
    return {
      es: "Elige el sabor de la pizza",
      pt: "Escolhe o sabor da pizza",
      en: "Choose pizza flavor",
      fr: "Choisissez la pizza",
    };
  }
  return {
    es: "Elige la carne",
    pt: "Escolhe a carne",
    en: "Choose meat",
    fr: "Choisir viande",
  };
}

export function resolveUnitLabel(product: MenuProduct): Record<string, string> {
  const kind = inferComboUnitKind(product);
  if (kind === "pizza") {
    return { es: "Pizza", pt: "Pizza", en: "Pizza", fr: "Pizza" };
  }
  if (kind === "pita") {
    return { es: "Pan pita", pt: "Pan pita", en: "Pan pita", fr: "Pan pita" };
  }
  if (kind === "rollo") {
    return { es: "Rollo", pt: "Rollo", en: "Roll", fr: "Roulé" };
  }
  return product.unitLabel || { es: "Unidad", pt: "Unidade", en: "Unit", fr: "Unité" };
}
