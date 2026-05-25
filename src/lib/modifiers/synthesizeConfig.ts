import type { MenuProduct } from "@/hooks/useMenuData";
import type { Extra, Variant } from "@/data/products";
import type { ModifierGroup, ModifierOption, ProductModifierConfig } from "./types";
import { sortModifierGroups } from "./groupOrder";
import { parseRemovableIngredients } from "@/lib/parseProductCustomization";

const SYNTH_PREFIX = "synth";

const MEAT_CATEGORY_RE = /pita|kebab|rollo|menu|combo|box|plato|taco|bowl|pizza/i;

const DEFAULT_MEAT_VARIANTS: Variant[] = [
  { id: "pollo", name: { es: "Pollo", pt: "Frango", en: "Chicken", fr: "Poulet" } },
  { id: "ternera", name: { es: "Ternera", pt: "Vaca", en: "Beef", fr: "Bœuf" } },
  { id: "mixto", name: { es: "Mixto", pt: "Mixto", en: "Mixed", fr: "Mixte" } },
];

function asLabel(name: Record<string, string>): Record<string, string> {
  const es = name.es || name.pt || name.en || "";
  return { es, pt: name.pt || es, en: name.en || es, fr: name.fr || es };
}

function isRemovalLabel(label: string): boolean {
  return /^(sin|sem|no|sans)\s+/i.test(label.trim());
}

function stripRemovalPrefix(label: string): string {
  return label.replace(/^(sin|sem|no|sans)\s+/i, "").trim();
}

function isSubstitutionOption(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    /patata|bravas|deluxe|fritas|lux/i.test(lower) &&
    !/extra|dentro|\+/i.test(lower)
  );
}

function isDrinkOption(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    /bebida|refresco|coca|fanta|sprite|nestea|aquarius|cola|2l|1\.5|1,5|zumo|agua/i.test(lower) ||
    /\b(l|litro)\b/i.test(lower)
  );
}

function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function inferComboUnitCount(product: MenuProduct): number {
  if (product.comboUnitCount && product.comboUnitCount > 1) return product.comboUnitCount;
  const text = `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`;
  const match = text.match(/\b(\d+)\s*(?:pan\s*)?(?:pita|pitas|rollo|rollos|pizza|pizzas|kebab|unit)/i);
  if (match) return Math.max(2, Number(match[1]) || 2);
  if (/combo|men[uú]|menu/i.test(text)) return 2;
  return 0;
}

function makeGroup(
  productId: string,
  key: string,
  partial: Omit<ModifierGroup, "id" | "storeId" | "options"> & { options: ModifierOption[] },
): ModifierGroup {
  return {
    id: `${SYNTH_PREFIX}-${productId}-${key}`,
    storeId: "",
    options: partial.options,
    ...partial,
  };
}

function optionFromExtra(productId: string, groupKey: string, extra: Extra, index: number, defaults?: Partial<ModifierOption>): ModifierOption {
  return {
    id: extra.id || `${SYNTH_PREFIX}-${productId}-${groupKey}-${index}`,
    groupId: `${SYNTH_PREFIX}-${productId}-${groupKey}`,
    name: asLabel(extra.name),
    priceDelta: extra.price || 0,
    maxQty: defaults?.maxQty ?? (extra.price > 0 ? 5 : 1),
    isDefault: defaults?.isDefault ?? false,
    sortOrder: index,
  };
}

/** Converte o produto do cardápio (extras, variantes, ingredientes) em grupos de personalização. */
export function synthesizeModifierConfigFromProduct(product: MenuProduct): ProductModifierConfig | null {
  const groups: ModifierGroup[] = [];
  const comboUnits = inferComboUnitCount(product);
  const isCombo = product.productType === "combo" || comboUnits > 1;
  const unitCount = isCombo ? Math.max(2, product.comboUnitCount || comboUnits) : 0;

  const meatVariants =
    product.variants?.length && product.variants.length >= 2
      ? product.variants
      : MEAT_CATEGORY_RE.test(`${product.categorySlug || ""} ${product.name.es || ""} ${product.name.pt || ""}`)
        ? DEFAULT_MEAT_VARIANTS
        : [];

  if (meatVariants.length >= 2) {
    groups.push(
      makeGroup(product.id, "choice-main", {
        name: { es: "Elige la carne", pt: "Escolhe a carne", en: "Choose meat", fr: "Choisir viande" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 0,
        repeatPerUnit: isCombo,
        linkSortOrder: 0,
        options: meatVariants.map((v, i) => ({
          id: v.id,
          groupId: `${SYNTH_PREFIX}-${product.id}-choice-main`,
          name: asLabel(v.name),
          priceDelta: 0,
          maxQty: 1,
          isDefault: i === 0,
          sortOrder: i,
        })),
      }),
    );
  }

  const removalLabels = new Set<string>();
  for (const ing of product.ingredients || []) {
    if (ing && !isDrinkOption(ing) && !isSubstitutionOption(ing)) removalLabels.add(ing);
  }

  const substitutionExtras: Extra[] = [];
  const drinkExtras: Extra[] = [];
  const paidExtras: Extra[] = [];

  for (const extra of product.extras || []) {
    const label = extra.name.es || extra.name.pt || extra.name.en || "";
    if (isRemovalLabel(label)) {
      removalLabels.add(stripRemovalPrefix(label));
      continue;
    }
    if (isSubstitutionOption(label)) {
      substitutionExtras.push(extra);
      continue;
    }
    if (isDrinkOption(label)) {
      drinkExtras.push(extra);
      continue;
    }
    paidExtras.push(extra);
  }

  const descFull = product.description.es || product.description.pt || product.description.en || "";
  for (const ing of parseRemovableIngredients(descFull, meatVariants.length >= 2)) {
    removalLabels.add(ing);
  }

  const descText = descFull.toLowerCase();

  if (isCombo && removalLabels.size === 0 && MEAT_CATEGORY_RE.test(`${product.categorySlug || ""} ${product.name.es || ""}`)) {
    for (const label of ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"]) {
      removalLabels.add(label);
    }
  }

  if (isCombo && drinkExtras.length < 2 && /bebida|refresco|2l|2 l/i.test(descText)) {
    for (const label of ["Coca-Cola", "Fanta Naranja", "Sprite", "Nestea"]) {
      drinkExtras.push({
        id: slugifyLabel(label),
        name: { es: label, pt: label, en: label, fr: label },
        price: 0,
      });
    }
  }

  if (removalLabels.size > 0) {
    groups.push(
      makeGroup(product.id, "removal", {
        name: { es: "Quitar ingredientes", pt: "Retirar ingredientes", en: "Remove ingredients", fr: "Retirer" },
        description: {},
        groupKind: "removal",
        selectionMode: "multiple",
        minSelect: 0,
        maxSelect: 99,
        isRequired: false,
        sortOrder: 2,
        repeatPerUnit: isCombo,
        linkSortOrder: 2,
        options: Array.from(removalLabels).map((label, i) => ({
          id: `${SYNTH_PREFIX}-${product.id}-rem-${i}`,
          groupId: `${SYNTH_PREFIX}-${product.id}-removal`,
          name: { es: label, pt: label, en: label, fr: label },
          priceDelta: 0,
          maxQty: 1,
          isDefault: false,
          sortOrder: i,
        })),
      }),
    );
  }

  if (substitutionExtras.length >= 2) {
    groups.push(
      makeGroup(product.id, "substitution", {
        name: { es: "Patatas / acompañamiento", pt: "Batatas / acompanhamento", en: "Side dish", fr: "Accompagnement" },
        description: {},
        groupKind: "substitution",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 1,
        repeatPerUnit: false,
        linkSortOrder: 1,
        options: substitutionExtras.map((e, i) =>
          optionFromExtra(product.id, "substitution", e, i, { isDefault: i === 0 && e.price === 0, maxQty: 1 }),
        ),
      }),
    );
  }

  if (drinkExtras.length >= 2) {
    groups.push(
      makeGroup(product.id, "drink", {
        name: { es: "Bebida", pt: "Bebida", en: "Drink", fr: "Boisson" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 1,
        repeatPerUnit: false,
        linkSortOrder: 1,
        options: drinkExtras.map((e, i) => optionFromExtra(product.id, "drink", e, i, { maxQty: 1 })),
      }),
    );
  } else if (drinkExtras.length === 1 && isCombo) {
    groups.push(
      makeGroup(product.id, "drink", {
        name: { es: "Bebida incluida", pt: "Bebida incluída", en: "Included drink", fr: "Boisson incluse" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 0,
        maxSelect: 1,
        isRequired: false,
        sortOrder: 1,
        repeatPerUnit: false,
        linkSortOrder: 1,
        options: drinkExtras.map((e, i) => optionFromExtra(product.id, "drink", e, i)),
      }),
    );
  }

  if (paidExtras.length > 0) {
    groups.push(
      makeGroup(product.id, "extra", {
        name: { es: "Extras", pt: "Extras", en: "Extras", fr: "Extras" },
        description: {},
        groupKind: "extra",
        selectionMode: "multiple",
        minSelect: 0,
        maxSelect: 99,
        isRequired: false,
        sortOrder: 3,
        repeatPerUnit: isCombo,
        linkSortOrder: 3,
        options: paidExtras.map((e, i) => optionFromExtra(product.id, "extra", e, i)),
      }),
    );
  }

  if (!groups.length && !isCombo) return null;

  // Combo sem grupos por unidade: activa carne por pita
  if (isCombo && !groups.some((g) => g.repeatPerUnit)) {
    groups.push(
      makeGroup(product.id, "choice-main", {
        name: { es: "Elige la carne", pt: "Escolhe a carne", en: "Choose meat", fr: "Choisir viande" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 0,
        repeatPerUnit: true,
        linkSortOrder: 0,
        options: DEFAULT_MEAT_VARIANTS.map((v, i) => ({
          id: v.id,
          groupId: `${SYNTH_PREFIX}-${product.id}-choice-main`,
          name: asLabel(v.name),
          priceDelta: 0,
          maxQty: 1,
          isDefault: i === 0,
          sortOrder: i,
        })),
      }),
    );
  }

  const unitLabel = product.unitLabel || {
    es: isCombo && /pita/i.test(product.name.es || product.name.pt || "") ? "Pita" : "Unidad",
    pt: isCombo && /pita/i.test(product.name.es || product.name.pt || "") ? "Pita" : "Unidade",
    en: "Unit",
    fr: "Unité",
  };

  return {
    productId: product.id,
    productType: isCombo ? "combo" : "simple",
    comboUnitCount: isCombo ? unitCount : 0,
    unitLabel,
    groups: sortModifierGroups(groups),
    hasStructuredModifiers: groups.length > 0,
  };
}

/** Aplica grupos da loja a combos quando o produto ainda não tem ligações manuais. */
export function mergeStoreGroupsForCombo(
  config: ProductModifierConfig,
  storeGroups: ModifierGroup[],
): ProductModifierConfig {
  if (config.hasStructuredModifiers || config.productType !== "combo" || !storeGroups.length) return config;

  const isDrinkGroup = (g: ModifierGroup) => {
    const label = `${g.name.es} ${g.name.pt}`.toLowerCase();
    return g.groupKind === "choice" && /bebida|refresco|drink|2l/i.test(label);
  };

  const groups = storeGroups.map((g) => ({
    ...g,
    repeatPerUnit:
      g.groupKind === "substitution" || isDrinkGroup(g)
        ? false
        : true,
    linkSortOrder: g.sortOrder,
  }));

  return {
    ...config,
    groups: sortModifierGroups(groups),
    hasStructuredModifiers: groups.length > 0,
  };
}
