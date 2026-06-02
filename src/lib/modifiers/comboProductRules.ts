import type { MenuProduct } from "@/hooks/useMenuData";
import type { Variant } from "@/data/products";
import { inferVariantsFromText, isMeatVariantSet } from "@/lib/parseProductCustomization";
import { isDrinkProduct } from "./drinkProduct";
import { inferComboUnitCountFromName, normalizeProductClassification, resolveIsComboProduct } from "./productClassification";

export type ComboUnitKind = "pita" | "rollo" | "pizza" | "piece" | "burger" | "kebab" | "sandwich" | null;
export type FixedProtein = "pollo" | "ternera" | "mixto" | "crispy";

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

export function detectFixedProtein(product: MenuProduct): FixedProtein | null {
  if (isDrinkProduct(product)) return null;

  const unitCount = inferComboUnitCount(product);
  if (unitCount > 1) return null;

  const classification = normalizeProductClassification(product);
  if (classification.productType === "combo" && classification.comboUnitCount > 1) return null;

  if (isClosedProteinCombo(product)) return "crispy";

  const name = productText(product);
  const desc = productDescriptionText(product);

  if (/\bpollo\s+o\s+ternera\b|\bo\s+ternera\b|\bo\s+pollo\b|\bpollo\s+o\b/i.test(desc)) return null;
  if (/\bsolo\s+carne\b/i.test(name) && !/\bde\s+(pollo|ternera)\b/i.test(name)) return null;
  if (/vegetal|falafel/i.test(name) || /falafel/i.test(desc)) return null;

  if (
    !/^combo\s/i.test(name) &&
    (/\bde\s+mixto\b|\bpita\s+de\s+mixto\b|\brollo\s+de\s+mixto\b|\bpan\s+de\s+pita\s+mixto\b|\brollo\s+mixto\b/i.test(name) ||
      (/\bpollo\s+y\s+ternera\b/i.test(desc) && !/\bo\s+/i.test(desc)))
  ) {
    return "mixto";
  }

  if (
    /\bde\s+pollo\b|\bpan\s+de\s+pita\s+de\s+pollo\b|\brollo\s+de\s+pollo\b|\bde\s+frango\b/i.test(name) &&
    (/carne\s+de\s+pollo/i.test(desc) || /\bde\s+pollo\b/i.test(name))
  ) {
    return "pollo";
  }

  if (
    /\bde\s+ternera\b|\bpan\s+de\s+pita\s+de\s+ternera\b|\brollo\s+de\s+ternera\b|\bde\s+vaca\b/i.test(name) &&
    !/\bmixto\b/i.test(name) &&
    (/carne\s+de\s+ternera/i.test(desc) || /\bde\s+ternera\b/i.test(name))
  ) {
    return "ternera";
  }

  if (
    /\bcrispy\b|\bpiezas?\s+\d*|\d+\s*piezas?\s+pollo|\bnuggets\b|\balitas\b|\bwings\b|\broaster\b/i.test(name) &&
    !/pita|rollo/i.test(name)
  ) {
    return "crispy";
  }

  return null;
}

export function hasFixedProtein(product: MenuProduct): boolean {
  return detectFixedProtein(product) !== null;
}

export function isVariableProteinProduct(product: MenuProduct): boolean {
  if (isDrinkProduct(product) || hasFixedProtein(product) || isClosedProteinCombo(product)) return false;
  const name = productText(product);
  const desc = productDescriptionText(product);
  const inferred = inferVariantsFromText(desc) || inferVariantsFromText(name);
  if (inferred.length >= 2 && isMeatVariantSet(inferred)) return true;
  if (product.variants && product.variants.length >= 2 && isMeatVariantSet(product.variants)) return true;
  if (inferComboUnitCount(product) > 1) {
    if (/combo\s+\d+\s+(pan\s*)?pita/i.test(name) && !/\bde\s+(pollo|ternera)\b/i.test(name)) return true;
    if (/combo\s+\d+\s+rollos?/i.test(name) && !/\bde\s+(pollo|ternera)\b/i.test(name)) return true;
  }
  if (/\bpan\s*(de\s*)?pita\b/i.test(name) && !/\bde\s+(pollo|ternera|mixto|crispy)\b/i.test(name) && !/\bpollo\b|\bternera\b|\bcrispy\b/i.test(name)) {
    return true;
  }
  if (/\brollo\s*(de\s*)?kebab\b/i.test(name) && !/\bde\s+(pollo|ternera)\b/i.test(name)) return true;
  return false;
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
  if (product.comboUnitCount && product.comboUnitCount > 0) return product.comboUnitCount;
  const normalized = normalizeProductClassification(product);
  if (normalized.comboUnitCount > 0) return normalized.comboUnitCount;
  const text = productText(product);
  if (isClosedProteinCombo(product)) return 0;
  return inferComboUnitCountFromName(product);
}

/** Só perguntar carne quando o produto realmente permite variação por unidade. */
export function allowsPerUnitMeatChoice(product: MenuProduct): boolean {
  if (hasFixedProtein(product) || isClosedProteinCombo(product)) return false;
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

export function globalMeatChoiceVariants(product: MenuProduct): Variant[] {
  if (!allowsGlobalMeatChoice(product)) return [];
  if (product.variants && product.variants.length >= 2) return product.variants;
  return DEFAULT_MEAT_VARIANTS;
}

export function allowsGlobalMeatChoice(product: MenuProduct): boolean {
  if (hasFixedProtein(product) || isClosedProteinCombo(product)) return false;
  if (allowsPerUnitMeatChoice(product) || allowsPerUnitPizzaFlavor(product)) return false;

  const name = productText(product);
  const desc = productDescriptionText(product);
  const inferred = inferVariantsFromText(desc) || inferVariantsFromText(name);
  if (inferred.length >= 2 && isMeatVariantSet(inferred)) return true;

  if (isVariableProteinProduct(product)) return true;

  if (product.variants && product.variants.length >= 2 && isMeatVariantSet(product.variants)) return true;
  return false;
}

export function allowsIngredientRemoval(product: MenuProduct): boolean {
  if (isClosedProteinCombo(product)) return false;
  const kind = inferComboUnitKind(product);
  return kind === "pita" || kind === "rollo" || kind === null;
}

export {
  productIncludesPotato,
  productIncludesSidePotato,
} from "./potatoRules";

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
