import type { MenuProduct } from "@/hooks/useMenuData";
import { isDrinkProduct } from "./drinkProduct";
import { inferComboUnitCount, productDescriptionText, productText } from "./comboProductRules";
import { resolveIsComboProduct } from "./productClassification";
import { findMenuProduct } from "./optionCatalog";

export const COMBO_POTATO_UPGRADE_PRICE = 0.5;

export const POTATO_EXTRA_GROUP_KEY = "potato-extra";

export function isPotatoOptionLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return /patata|bravas|deluxe|fritas|lux|batata/i.test(lower) && !/extra|dentro/i.test(lower);
}

/**
 * Batata como acompanhamento incluído (menu/combo), não batata dentro do pita/rollo.
 */
export function productIncludesSidePotato(product: MenuProduct): boolean {
  if (isDrinkProduct(product)) return false;

  const name = productText(product);
  const desc = productDescriptionText(product);
  const blob = `${name} ${desc}`;

  if (/patatas?\s+(fritas\s+)?incluid|incluye\s+patatas|ración\s+de\s+patatas/i.test(blob)) {
    return true;
  }

  if (/menú|menu|combo/i.test(name)) {
    if (/\+\s*patatas|patatas\s*\+|patatas\s+fritas\s*\+\s*bebida/i.test(blob)) return true;
    if (/patatas/i.test(blob) && /bebida|refresco|2\s*l|33\s*cl|lata/i.test(blob)) return true;
  }

  if (resolveIsComboProduct(product)) {
    if (/^combo\s/i.test(name) && /patatas\s+fritas/i.test(blob)) return true;
    if (inferComboUnitCount(product) > 1 && /patatas\s+fritas/i.test(blob) && /\+|bebida|refresco/i.test(blob)) {
      return true;
    }
  }

  return false;
}

/** @deprecated Use productIncludesSidePotato */
export function productIncludesPotato(product: MenuProduct): boolean {
  return productIncludesSidePotato(product);
}

export function shouldOfferPotatoExtra(product: MenuProduct): boolean {
  if (isDrinkProduct(product) || productIncludesSidePotato(product) || resolveIsComboProduct(product)) {
    return false;
  }
  const name = productText(product);
  if (/^patatas?\b|^batatas?\b/i.test(name.trim())) return false;
  return true;
}

export type PotatoMenuOption = {
  id: string;
  name: Record<string, string>;
  price: number;
};

function labelRecord(product: MenuProduct): Record<string, string> {
  const es = product.name?.es || product.name?.pt || product.name?.en || "";
  return {
    es,
    pt: product.name?.pt || es,
    en: product.name?.en || es,
    fr: product.name?.fr || es,
  };
}

/** Preços reais das batatas do cardápio (produto separado). */
export function resolvePotatoMenuOptions(menuProducts: MenuProduct[]): PotatoMenuOption[] {
  const specs: Array<{ patterns: RegExp[]; fallback: Record<string, string> }> = [
    {
      patterns: [/patatas?\s*fritas/i, /^patatas fritas$/i],
      fallback: { es: "Patatas fritas", pt: "Patatas fritas", en: "French fries", fr: "Frites" },
    },
    {
      patterns: [/patatas?\s*bravas/i, /\bbravas\b/i],
      fallback: { es: "Patatas bravas", pt: "Patatas bravas", en: "Patatas bravas", fr: "Patatas bravas" },
    },
    {
      patterns: [/patatas?\s*(de\s*)?lux/i, /patatas?\s*deluxe/i, /patatas?\s*especial/i],
      fallback: { es: "Patatas de lux", pt: "Patatas de lux", en: "Deluxe fries", fr: "Frites deluxe" },
    },
  ];

  const out: PotatoMenuOption[] = [];
  for (const spec of specs) {
    const match = findMenuProduct(menuProducts, spec.patterns);
    if (match) {
      out.push({
        id: match.id,
        name: labelRecord(match),
        price: Number(match.price) || 0,
      });
    }
  }
  return out;
}

export function isPotatoExtraGroupId(groupId: string): boolean {
  return groupId.includes(POTATO_EXTRA_GROUP_KEY);
}

export function buildPotatoExtraGroupFromMenu(
  productId: string,
  menuProducts: MenuProduct[],
): import("./types").ModifierGroup | null {
  const menuPotatoes = resolvePotatoMenuOptions(menuProducts);
  if (menuPotatoes.length === 0) return null;

  const groupId = `synth-${productId}-${POTATO_EXTRA_GROUP_KEY}`;
  const options = menuPotatoes.map((p, i) => ({
    id: p.id,
    groupId,
    name: p.name,
    priceDelta: p.price,
    maxQty: 1,
    isDefault: false,
    sortOrder: i,
  }));

  return {
    id: groupId,
    storeId: "",
    name: {
      es: "¿Quieres añadir patatas?",
      pt: "Quer adicionar batatas?",
      en: "Add fries?",
      fr: "Ajouter des frites ?",
    },
    description: {},
    groupKind: "extra",
    selectionMode: "single",
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    sortOrder: 2,
    repeatPerUnit: false,
    linkSortOrder: 2,
    options,
  };
}

export function resolvePotatoExtraPriceFromMenu(
  optionName: Record<string, string>,
  menuProducts: MenuProduct[],
): number | null {
  const label = `${optionName.es || ""} ${optionName.pt || ""}`.toLowerCase();
  const menuOpts = resolvePotatoMenuOptions(menuProducts);
  const match = menuOpts.find((o) => {
    const ol = `${o.name.es} ${o.name.pt}`.toLowerCase();
    if (/bravas/.test(label)) return /bravas/.test(ol);
    if (/lux|deluxe|especial/.test(label)) return /lux|deluxe|especial/.test(ol);
    if (/fritas|incluid/.test(label)) return /fritas/.test(ol) && !/bravas|lux|deluxe/.test(ol);
    return ol.includes(label.trim()) || label.includes(ol.trim());
  });
  return match ? match.price : null;
}
