import type { Extra } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierOption } from "./types";
import { productDescriptionText } from "./comboProductRules";

export type DrinkSizeRule = "2l" | "125l" | "33cl" | "small_water";

export function detectDrinkSizeRule(description: string): DrinkSizeRule | null {
  const d = description.toLowerCase();

  if (/33\s*cl|33cl|\blata\b|\blatas\b/.test(d)) return "33cl";
  if (/1[\.,]25\s*l|125\s*cl|1[\.,]25l/.test(d)) return "125l";
  if (/agua peque|agua\s*peque|agua mineral peque|agua\s*33|500\s*ml/.test(d)) return "small_water";
  if (/2\s*l\b|2l\b|botella\s*2|bebida\s*2|2\s*litros?|refresco\s*2/.test(d)) return "2l";

  return null;
}

export function drinkLabelMatchesRule(label: string, rule: DrinkSizeRule | null): boolean {
  if (!rule) return false;
  const l = label.toLowerCase();

  switch (rule) {
    case "2l": {
      if (/33\s*cl|33cl|\blata\b|1[\.,]25|125\s*cl|peque|grande|500\s*ml|50\s*cl|monster|zumo|juice|bi frutas|aquarius(?!\s*2)|nestea(?!\s*2)/i.test(l)) {
        return false;
      }
      if (/agua/i.test(l) && !/2\s*l|2l/.test(l)) return false;
      return /2\s*l|2l|2000\s*ml|botella\s*2|refresco\s*botella\s*2/i.test(l);
    }
    case "33cl": {
      if (/2\s*l|2l|1[\.,]25|125|botella\s*2|agua grande|agua peque|monster|zumo|juice|500\s*ml/i.test(l)) {
        return false;
      }
      return /33\s*cl|33cl|\blata\b|lata\s*33/i.test(l);
    }
    case "125l": {
      if (/2\s*l|33\s*cl|lata|peque|monster|zumo|juice|agua/i.test(l)) return false;
      return /1[\.,]25\s*l|1[\.,]25l|125\s*cl|1250/i.test(l);
    }
    case "small_water": {
      return /agua/i.test(l) && /peque|33|500|50\s*cl|small/i.test(l);
    }
    default:
      return false;
  }
}

function optionLabel(option: Pick<ModifierOption, "name">): string {
  return `${option.name.es || ""} ${option.name.pt || ""} ${option.name.en || ""}`.trim();
}

function extraLabel(extra: Extra): string {
  return `${extra.name.es || ""} ${extra.name.pt || ""} ${extra.name.en || ""}`.trim();
}

export function drinkProductLabel(product: MenuProduct): string {
  return `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`.trim();
}

export function drinkProductMatchesRule(product: MenuProduct, rule: DrinkSizeRule | null): boolean {
  return drinkLabelMatchesRule(drinkProductLabel(product), rule);
}

export function drinkExtraMatchesRule(extra: Extra, rule: DrinkSizeRule | null): boolean {
  return drinkLabelMatchesRule(extraLabel(extra), rule);
}

export function drinkOptionMatchesRule(option: ModifierOption, rule: DrinkSizeRule | null): boolean {
  return drinkLabelMatchesRule(optionLabel(option), rule);
}

export function resolveDrinkSizeRuleForProduct(product: MenuProduct): DrinkSizeRule | null {
  const desc = `${productDescriptionText(product)} ${product.description?.es || ""} ${product.description?.pt || ""}`;
  return detectDrinkSizeRule(desc);
}

export const DEFAULT_DRINK_LABELS: Record<DrinkSizeRule, string[]> = {
  "2l": ["Coca-Cola 2L", "Fanta Naranja 2L"],
  "33cl": ["Coca-Cola Lata 33cl", "Fanta Naranja Lata 33cl", "Sprite Lata 33cl"],
  "125l": ["Coca-Cola 1.25L", "Fanta Naranja 1.25L", "Sprite 1.25L"],
  small_water: ["Agua Pequeña", "Agua Mineral 50cl"],
};
