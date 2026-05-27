import type { MenuProduct } from "@/hooks/useMenuData";
import type { Extra, Variant } from "@/data/products";
import type { ModifierGroup, ModifierOption, ProductModifierConfig } from "./types";
import { sortModifierGroups } from "./groupOrder";
import { sanitizeProductModifierConfig } from "./sanitizeGroups";
import { parseRemovableIngredients } from "@/lib/parseProductCustomization";
import { isDrinkProduct, resolveDrinkExtrasFromMenu } from "@/lib/modifiers/drinkProduct";
import { drinkExtraMatchesRule, resolveDrinkSizeRuleForProduct, DEFAULT_DRINK_LABELS } from "@/lib/modifiers/drinkSizeRules";
import {
  allowsIngredientRemoval,
  globalMeatChoiceVariants,
  allowsPerUnitMeatChoice,
  allowsPerUnitPizzaFlavor,
  inferComboUnitCount,
  inferComboUnitKind,
  isClosedProteinCombo,
  perUnitChoiceGroupName,
  perUnitChoiceVariants,
  productDescriptionText,
  productIncludesPotato,
  resolveUnitLabel,
} from "./comboProductRules";
import {
  descriptionIncludesDrink,
  normalizeProductClassification,
  resolveIsComboProduct,
} from "./productClassification";

const SYNTH_PREFIX = "synth";

function asLabel(name: Record<string, string>): Record<string, string> {
  const es = name.es || name.pt || name.en || "";
  return { es, pt: name.pt || es, en: name.en || es, fr: name.fr || es };
}

function cleanSideOptionName(name: Record<string, string>): Record<string, string> {
  const raw = name.es || name.pt || name.en || "";
  if (/bravas/i.test(raw)) {
    return { es: "Patatas bravas", pt: "Patatas bravas", en: "Patatas bravas", fr: "Patatas bravas" };
  }
  if (/upgrade|lux|especial|deluxe/i.test(raw)) {
    return { es: "Patatas de lux", pt: "Patatas de lux", en: "Deluxe fries", fr: "Frites deluxe" };
  }
  return asLabel(name);
}

function isRemovalLabel(label: string): boolean {
  return /^(sin|sem|no|sans)\s+/i.test(label.trim());
}

function stripRemovalPrefix(label: string): string {
  return label.replace(/^(sin|sem|no|sans)\s+/i, "").trim();
}

function isSubstitutionOption(label: string): boolean {
  const lower = label.toLowerCase();
  return /patata|bravas|deluxe|fritas|lux|batata/i.test(lower) && !/extra|dentro|\+/i.test(lower);
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

function optionFromExtra(
  productId: string,
  groupKey: string,
  extra: Extra,
  index: number,
  defaults?: Partial<ModifierOption>,
): ModifierOption {
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

function variantsToOptions(productId: string, groupKey: string, variants: Variant[]): ModifierOption[] {
  return variants.map((v, i) => ({
    id: v.id,
    groupId: `${SYNTH_PREFIX}-${productId}-${groupKey}`,
    name: asLabel(v.name),
    priceDelta: 0,
    maxQty: 1,
    isDefault: i === 0,
    sortOrder: i,
  }));
}

const COMBO_POTATO_UPGRADE_PRICE = 0.5;

function buildPotatoSubstitutionGroup(product: MenuProduct, substitutionExtras: Extra[]): ModifierGroup | null {
  const isCombo = resolveIsComboProduct(product);
  if (!isCombo && substitutionExtras.length === 0) return null;

  const productId = product.id;
  let options: ModifierOption[] = substitutionExtras.map((e, i) => {
    const opt = optionFromExtra(productId, "substitution", e, i, {
      isDefault: i === 0 && e.price === 0,
      maxQty: 1,
    });
    const label = `${e.name.es || ""} ${e.name.pt || ""}`.toLowerCase();
    const priceDelta =
      e.price > 0 && productIncludesPotato(product) && /bravas|lux|deluxe|especial/.test(label)
        ? COMBO_POTATO_UPGRADE_PRICE
        : e.price || 0;
    return { ...opt, name: cleanSideOptionName(e.name), priceDelta };
  });

  const upgradeExtra = (product.extras || []).find((e) => {
    const label = `${e.name.es} ${e.name.pt}`.toLowerCase();
    return isSubstitutionOption(label) && e.price > 0;
  });

  const hasIncluded = options.some((o) => o.priceDelta === 0);
  if (isCombo && !hasIncluded && (productIncludesPotato(product) || options.length > 0)) {
    options = [
      {
        id: `${SYNTH_PREFIX}-${productId}-substitution-included`,
        groupId: `${SYNTH_PREFIX}-${productId}-substitution`,
        name: {
          es: "Patatas fritas (incluidas)",
          pt: "Batata tradicional incluída",
          en: "Fries (included)",
          fr: "Frites (incluses)",
        },
        priceDelta: 0,
        maxQty: 1,
        isDefault: true,
        sortOrder: -1,
      },
      ...options.map((o) => ({ ...o, isDefault: false })),
    ];
  }

  if (upgradeExtra && !options.some((o) => /bravas/i.test(`${o.name.es} ${o.name.pt}`))) {
    const opt = optionFromExtra(productId, "substitution", upgradeExtra, options.length, {
      isDefault: false,
      maxQty: 1,
    });
    options.push({
      ...opt,
      name: cleanSideOptionName(upgradeExtra.name),
      priceDelta: COMBO_POTATO_UPGRADE_PRICE,
    });
  } else if (isCombo && productIncludesPotato(product) && !options.some((o) => /bravas/i.test(`${o.name.es} ${o.name.pt}`))) {
    options.push({
      id: `${SYNTH_PREFIX}-${productId}-substitution-bravas`,
      groupId: `${SYNTH_PREFIX}-${productId}-substitution`,
      name: {
        es: "Patatas bravas",
        pt: "Patatas bravas",
        en: "Patatas bravas",
        fr: "Patatas bravas",
      },
      priceDelta: COMBO_POTATO_UPGRADE_PRICE,
      maxQty: 1,
      isDefault: false,
      sortOrder: 98,
    });
  }

  if (isCombo && productIncludesPotato(product) && !options.some((o) => /lux|deluxe|especial/i.test(`${o.name.es} ${o.name.pt}`))) {
    options.push({
      id: `${SYNTH_PREFIX}-${productId}-substitution-lux`,
      groupId: `${SYNTH_PREFIX}-${productId}-substitution`,
      name: {
        es: "Patatas de lux",
        pt: "Patatas de lux",
        en: "Deluxe fries",
        fr: "Frites deluxe",
      },
      priceDelta: COMBO_POTATO_UPGRADE_PRICE,
      maxQty: 1,
      isDefault: false,
      sortOrder: 99,
    });
  }

  if (options.length < 2) return null;

  return makeGroup(productId, "substitution", {
    name: { es: "Acompañamiento", pt: "Acompanhamento", en: "Side dish", fr: "Accompagnement" },
    description: {},
    groupKind: "substitution",
    selectionMode: "single",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    sortOrder: 1,
    repeatPerUnit: false,
    linkSortOrder: 1,
    options,
  });
}

/** Converte o produto do cardápio (extras, variantes, ingredientes) em grupos de personalização. */
function buildModifierConfigFromProduct(
  product: MenuProduct,
  menuProducts: MenuProduct[] = [],
): ProductModifierConfig | null {
  const groups: ModifierGroup[] = [];
  const unitCount = inferComboUnitCount(product);
  const isMultiUnit = unitCount > 1;
  const isCombo = resolveIsComboProduct(product);
  const isDrink = isDrinkProduct(product);
  const perUnitVariants = perUnitChoiceVariants(product);
  const globalMeatVariants = globalMeatChoiceVariants(product);

  const drinkVariants = isDrink && product.variants && product.variants.length >= 2 ? product.variants : [];

  if (globalMeatVariants.length >= 2) {
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
        repeatPerUnit: false,
        linkSortOrder: 0,
        options: variantsToOptions(product.id, "choice-main", globalMeatVariants),
      }),
    );
  }

  if (allowsPerUnitMeatChoice(product) || allowsPerUnitPizzaFlavor(product)) {
    const groupKey = allowsPerUnitPizzaFlavor(product) ? "pizza-flavor" : "choice-main";
    groups.push(
      makeGroup(product.id, groupKey, {
        name: perUnitChoiceGroupName(product),
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 0,
        repeatPerUnit: true,
        linkSortOrder: 0,
        options: variantsToOptions(product.id, groupKey, perUnitVariants),
      }),
    );
  }

  if (drinkVariants.length >= 2) {
    groups.push(
      makeGroup(product.id, "drink-flavor", {
        name: { es: "Elige tu refresco", pt: "Escolhe o refresco", en: "Choose your drink", fr: "Choisissez votre boisson" },
        description: {},
        groupKind: "choice",
        selectionMode: "single",
        minSelect: 1,
        maxSelect: 1,
        isRequired: true,
        sortOrder: 0,
        repeatPerUnit: false,
        linkSortOrder: 0,
        options: variantsToOptions(product.id, "drink-flavor", drinkVariants),
      }),
    );
  }

  const removalLabels = new Set<string>();
  const substitutionExtras: Extra[] = [];
  const drinkExtras: Extra[] = [];
  const paidExtras: Extra[] = [];

  if (!isDrink && allowsIngredientRemoval(product)) {
    for (const ing of product.ingredients || []) {
      if (ing && !isDrinkOption(ing) && !isSubstitutionOption(ing)) removalLabels.add(ing);
    }
  }

  for (const extra of product.extras || []) {
    const label = extra.name.es || extra.name.pt || extra.name.en || "";
    if (!isDrink && isRemovalLabel(label)) {
      removalLabels.add(stripRemovalPrefix(label));
      continue;
    }
    if (isSubstitutionOption(label)) {
      substitutionExtras.push(extra);
      continue;
    }
    if (isDrinkOption(label)) {
      const rule = resolveDrinkSizeRuleForProduct(product);
      if (!rule || drinkExtraMatchesRule(extra, rule)) {
        drinkExtras.push(extra);
      }
      continue;
    }
    paidExtras.push(extra);
  }

  const descFull = product.description?.es || product.description?.pt || product.description?.en || "";
  if (!isDrink && allowsIngredientRemoval(product)) {
    for (const ing of parseRemovableIngredients(descFull, globalMeatVariants.length >= 2)) {
      removalLabels.add(ing);
    }
  }

  const descText = `${descFull} ${productDescriptionText(product)}`.toLowerCase();

  if (
    !isDrink &&
    isMultiUnit &&
    allowsIngredientRemoval(product) &&
    removalLabels.size === 0 &&
    (inferComboUnitKind(product) === "pita" || inferComboUnitKind(product) === "rollo")
  ) {
    for (const label of ["Lechuga", "Col", "Tomate", "Pepino", "Cebolla", "Maíz", "Zanahoria", "Salsas"]) {
      removalLabels.add(label);
    }
  }

  if (isCombo && drinkExtras.length < 2 && descriptionIncludesDrink(product)) {
    const fromMenu = menuProducts.length ? resolveDrinkExtrasFromMenu(product, menuProducts) : [];
    for (const drink of fromMenu) {
      if (!drinkExtras.some((e) => e.id === drink.id)) drinkExtras.push(drink);
    }
  }

  if (isCombo && drinkExtras.length < 2 && descriptionIncludesDrink(product)) {
    const rule = resolveDrinkSizeRuleForProduct(product);
    const defaults = rule ? DEFAULT_DRINK_LABELS[rule] : ["Coca-Cola", "Fanta Naranja", "Sprite", "Nestea"];
    for (const label of defaults) {
      if (drinkExtras.some((e) => (e.name.es || e.name.pt) === label)) continue;
      drinkExtras.push({
        id: slugifyLabel(label),
        name: { es: label, pt: label, en: label, fr: label },
        price: 0,
      });
    }
  }

  if (!isDrink && allowsIngredientRemoval(product) && removalLabels.size > 0) {
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
        repeatPerUnit: isMultiUnit && allowsIngredientRemoval(product),
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

  const potatoGroup =
    isCombo || substitutionExtras.length > 0
      ? buildPotatoSubstitutionGroup(product, substitutionExtras)
      : null;
  if (potatoGroup) {
    groups.push(potatoGroup);
  } else if (substitutionExtras.length >= 2) {
    groups.push(
      makeGroup(product.id, "substitution", {
        name: { es: "Acompañamiento", pt: "Acompanhamento", en: "Side dish", fr: "Accompagnement" },
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
        repeatPerUnit: isMultiUnit && allowsIngredientRemoval(product),
        linkSortOrder: 3,
        options: paidExtras.map((e, i) => optionFromExtra(product.id, "extra", e, i)),
      }),
    );
  }

  if (!groups.length && !isCombo) return null;

  return sanitizeProductModifierConfig({
    productId: product.id,
    productType: isCombo ? "combo" : "simple",
    comboUnitCount: isMultiUnit ? unitCount : 0,
    unitLabel: resolveUnitLabel(product),
    groups: sortModifierGroups(groups),
    hasStructuredModifiers: groups.length > 0,
  });
}

export function synthesizeModifierConfigFromProduct(
  product: MenuProduct,
  menuProducts: MenuProduct[] = [],
): ProductModifierConfig | null {
  try {
    return buildModifierConfigFromProduct(product, menuProducts);
  } catch (err) {
    console.error("[synthesizeModifierConfigFromProduct]", product.id, err);
    return null;
  }
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
    repeatPerUnit: g.groupKind === "substitution" || isDrinkGroup(g) ? false : true,
    linkSortOrder: g.sortOrder,
  }));

  return sanitizeProductModifierConfig({
    ...config,
    groups: sortModifierGroups(groups),
    hasStructuredModifiers: groups.length > 0,
  });
}
