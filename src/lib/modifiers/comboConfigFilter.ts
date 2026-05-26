import type { MenuProduct } from "@/hooks/useMenuData";
import type { Extra } from "@/data/products";
import type { ModifierGroup, ModifierOption, ProductModifierConfig } from "./types";
import { productIncludesPotato } from "./comboProductRules";
import { descriptionIncludesDrink, resolveIsComboProduct } from "./productClassification";
import { isDrinkProduct, resolveDrinkExtrasFromMenu } from "./drinkProduct";
import {
  DEFAULT_DRINK_LABELS,
  drinkOptionMatchesRule,
  drinkProductMatchesRule,
  resolveDrinkSizeRuleForProduct,
  type DrinkSizeRule,
} from "./drinkSizeRules";
import { enrichOptionWithMenuImage } from "./optionCatalog";
import { synthesizeModifierConfigFromProduct } from "./synthesizeConfig";
import { filterProductModifierConfig } from "./proteinRules";

const COMBO_POTATO_UPGRADE_PRICE = 0.5;

function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function optionText(option: ModifierOption): string {
  return `${option.name.es || ""} ${option.name.pt || ""} ${option.name.en || ""}`.toLowerCase();
}

function optionLooksLikeDrinkOption(option: ModifierOption): boolean {
  return /coca|fanta|sprite|nestea|aquarius|refresco|agua|zumo|cola|monster|bebida|33\s*cl|2\s*l|lata/i.test(
    optionText(option),
  );
}

function isDrinkGroup(group: ModifierGroup): boolean {
  const label = `${group.name.es || ""} ${group.name.pt || ""}`.toLowerCase();
  if (group.groupKind !== "choice") return false;
  if (/bebida|refresco|drink|boisson/i.test(label)) return true;
  if (group.options.length < 2) return false;
  const drinkLike = group.options.filter(optionLooksLikeDrinkOption).length;
  return drinkLike >= 2 && drinkLike >= Math.ceil(group.options.length * 0.5);
}

function isPotatoGroup(group: ModifierGroup): boolean {
  return (
    group.groupKind === "substitution" ||
    /acompa|patata|side|batata/i.test(`${group.name.es || ""} ${group.name.pt || ""}`.toLowerCase())
  );
}

function optionFromExtra(groupId: string, extra: Extra, index: number): ModifierOption {
  const es = extra.name.es || extra.name.pt || extra.name.en || "";
  return {
    id: extra.id || `drink-${index}`,
    groupId,
    name: { es, pt: extra.name.pt || es, en: extra.name.en || es, fr: extra.name.fr || es },
    priceDelta: extra.price || 0,
    maxQty: 1,
    isDefault: index === 0,
    sortOrder: index,
  };
}

function fallbackDrinkOptions(groupId: string, rule: DrinkSizeRule): ModifierOption[] {
  return DEFAULT_DRINK_LABELS[rule].map((label, index) => ({
    id: slugifyLabel(label),
    groupId,
    name: { es: label, pt: label, en: label, fr: label },
    priceDelta: 0,
    maxQty: 1,
    isDefault: index === 0,
    sortOrder: index,
  }));
}

function rebuildDrinkOptions(
  product: MenuProduct,
  group: ModifierGroup,
  menuProducts: MenuProduct[],
  rule: DrinkSizeRule,
): ModifierOption[] {
  const fromMenu = resolveDrinkExtrasFromMenu(product, menuProducts).map((extra, index) =>
    optionFromExtra(group.id, extra, index),
  );

  // Ignorar opções cruas da BD — reconstruir só a partir do cardápio + fallback do tamanho certo.
  const merged: ModifierOption[] = [...fromMenu];

  if (merged.length < 2) {
    for (const fallback of fallbackDrinkOptions(group.id, rule)) {
      if (!merged.some((m) => m.name.es === fallback.name.es)) merged.push(fallback);
    }
  }

  return merged.slice(0, 8).map((opt, index) => ({ ...opt, isDefault: index === 0, sortOrder: index }));
}

function normalizePotatoOption(product: MenuProduct, option: ModifierOption): ModifierOption {
  if (option.priceDelta === 0) return option;
  if (!productIncludesPotato(product)) return option;

  const label = `${option.name.es || ""} ${option.name.pt || ""}`.toLowerCase();
  if (/bravas|lux|deluxe|especial/.test(label)) {
    return { ...option, priceDelta: COMBO_POTATO_UPGRADE_PRICE };
  }
  return option;
}

function filterDrinkGroup(
  product: MenuProduct,
  group: ModifierGroup,
  menuProducts: MenuProduct[],
): ModifierGroup {
  const rule = resolveDrinkSizeRuleForProduct(product);
  if (!rule) return group;
  return { ...group, options: rebuildDrinkOptions(product, group, menuProducts, rule) };
}

function filterPotatoGroup(product: MenuProduct, group: ModifierGroup): ModifierGroup {
  return {
    ...group,
    options: group.options.map((opt) => normalizePotatoOption(product, opt)),
  };
}

function enrichGroupOptions(group: ModifierGroup, menuProducts: MenuProduct[]): ModifierGroup {
  const groupName = `${group.name.es || ""} ${group.name.pt || ""}`;
  return {
    ...group,
    options: group.options.map((opt) =>
      enrichOptionWithMenuImage(opt, menuProducts, group.groupKind, groupName),
    ),
  };
}

/** Aplica regras do combo (tamanho bebida, preço batata, imagens reais) sobre qualquer config. */
export function applyComboDescriptionRules(
  product: MenuProduct,
  config: ProductModifierConfig | null,
  menuProducts: MenuProduct[] = [],
): ProductModifierConfig | null {
  if (!config) return null;

  let groups = config.groups.map((group) => {
    let next = group;
    if (isDrinkGroup(group) && descriptionIncludesDrink(product)) {
      next = filterDrinkGroup(product, group, menuProducts);
    }
    if (isPotatoGroup(group)) {
      next = filterPotatoGroup(product, next);
    }
    return enrichGroupOptions(next, menuProducts);
  });

  if (descriptionIncludesDrink(product) && resolveIsComboProduct(product) && !groups.some(isDrinkGroup)) {
    const rule = resolveDrinkSizeRuleForProduct(product);
    if (rule) {
      const drinkGroup: ModifierGroup = {
        id: `filtered-${product.id}-drink`,
        storeId: "",
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
        options: [],
      };
      groups = [...groups, enrichGroupOptions(filterDrinkGroup(product, drinkGroup, menuProducts), menuProducts)];
    }
  }

  return {
    ...config,
    groups,
    hasStructuredModifiers: groups.some((g) => g.options.length > 0),
  };
}

export function isComboAuditProduct(product: MenuProduct): boolean {
  const name = product.name?.es || product.name?.pt || "";
  return resolveIsComboProduct(product) || /^(combo|menú|menu)\s/i.test(name);
}

export type ComboAuditRow = {
  comboName: string;
  drinkRule: DrinkSizeRule | null;
  drinksShown: string[];
  drinksExpected: string[];
  potatoIncluded: string | null;
  potatoUpgrades: { name: string; price: string }[];
  imagesUsed: { option: string; hasImage: boolean }[];
};

export function auditComboConfigurations(
  products: MenuProduct[],
  menuProducts: MenuProduct[] = products,
): ComboAuditRow[] {
  const combos = products.filter(isComboAuditProduct);

  return combos.map((product) => {
    const raw = synthesizeModifierConfigFromProduct(product, menuProducts);
    const synthesized = raw ? filterProductModifierConfig(product, raw) : null;
    const config = applyComboDescriptionRules(product, synthesized, menuProducts);
    const rule = resolveDrinkSizeRuleForProduct(product);

    const drinkGroup = config?.groups.find(isDrinkGroup);
    const potatoGroup = config?.groups.find(isPotatoGroup);

    const drinksShown = (drinkGroup?.options || []).map((o) => o.name.es || o.name.pt || "");
    const expectedFromMenu = rule
      ? menuProducts
          .filter((p) => isDrinkProduct(p) && drinkProductMatchesRule(p, rule))
          .map((p) => p.name.es || p.name.pt || "")
      : [];

    const included = potatoGroup?.options.find((o) => o.priceDelta === 0);
    const upgrades = (potatoGroup?.options || [])
      .filter((o) => o.priceDelta > 0)
      .map((o) => ({
        name: o.name.es || o.name.pt || "",
        price: `+${o.priceDelta.toFixed(2)}€`,
      }));

    const imageOptions = [...(drinkGroup?.options || []), ...(potatoGroup?.options || [])];

    return {
      comboName: product.name.es || product.name.pt || product.id,
      drinkRule: rule,
      drinksShown,
      drinksExpected: expectedFromMenu.length ? expectedFromMenu : rule ? DEFAULT_DRINK_LABELS[rule] : [],
      potatoIncluded: included ? included.name.es || included.name.pt || null : null,
      potatoUpgrades: upgrades,
      imagesUsed: imageOptions.map((o) => ({
        option: o.name.es || o.name.pt || "",
        hasImage: Boolean(o.imageUrl),
      })),
    };
  });
}
