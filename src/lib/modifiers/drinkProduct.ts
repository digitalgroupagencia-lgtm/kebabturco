import type { MenuProduct } from "@/hooks/useMenuData";
import type { Extra } from "@/data/products";
import type { ModifierGroup, ProductModifierConfig } from "./types";
import { sortModifierGroups } from "./groupOrder";
import { productDescriptionText } from "./comboProductRules";

const DRINK_CATEGORY_RE = /bebida|drink|boisson|refresco|boissons/i;
const DRINK_NAME_RE = /refresco|lata\s*33|bebida|coca|fanta|sprite|nestea|aquarius|agua|zumo|cola/i;
const MEAT_LABEL_RE = /carne|meat|pollo|ternera|viande|frango/i;
const DRINK_OPTION_RE = /coca|fanta|sprite|nestea|aquarius|cola|zumo|agua|refresco|pepsi|7up|tonica/i;

export function isDrinkProduct(product: MenuProduct | undefined): boolean {
  if (!product) return false;
  const cat = `${product.category} ${product.categorySlug || ""}`.toLowerCase();
  if (DRINK_CATEGORY_RE.test(cat)) return true;
  const text = `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`.toLowerCase();
  return DRINK_NAME_RE.test(text);
}

function drinkProductLabel(product: MenuProduct): string {
  return `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`.toLowerCase();
}

/** Prefer active drink products from the menu when synthesizing combo drink choices. */
export function resolveDrinkExtrasFromMenu(product: MenuProduct, menuProducts: MenuProduct[]): Extra[] {
  const desc = productDescriptionText(product);
  const isLarge = /2l|2 l|litro|1\.5l|1,5l/i.test(desc);
  const isSmall = /33cl|33 cl|lata/i.test(desc);

  const drinks = menuProducts.filter(
    (item) => item.id !== product.id && isDrinkProduct(item),
  );

  const matched = drinks.filter((item) => {
    const label = drinkProductLabel(item);
    if (isLarge) return /2\s*l|2l|litro|1\.5|1,5/i.test(label);
    if (isSmall) return /33\s*cl|33cl|lata/i.test(label);
    return /coca|fanta|sprite|nestea|aquarius|refresco|cola|pepsi|7up|zumo|agua/i.test(label);
  });

  const pool = matched.length >= 2 ? matched : drinks;
  return pool.slice(0, 8).map((item) => ({
    id: item.id,
    name: item.name,
    price: 0,
  }));
}

function optionLooksLikeDrink(group: ModifierGroup): boolean {
  if (group.options.length < 2) return false;
  const hits = group.options.filter((o) => {
    const label = `${o.name.es} ${o.name.pt} ${o.name.en}`.toLowerCase();
    return DRINK_OPTION_RE.test(label);
  });
  return hits.length >= 2;
}

function groupLabel(group: ModifierGroup): string {
  return `${group.name.es} ${group.name.pt} ${group.name.en}`.toLowerCase();
}

function synthDrinkPreferenceGroups(productId: string, existing: ModifierGroup[]): ModifierGroup[] {
  const hasTemp = existing.some((g) => /temperatura|temperature|fr[ií]a|gelada/i.test(groupLabel(g)));
  const hasIce = existing.some((g) => /hielo|gelo|ice/i.test(groupLabel(g)));
  const out: ModifierGroup[] = [];

  if (!hasTemp) {
    out.push({
      id: `synth-${productId}-drink-temp`,
      storeId: "",
      name: { es: "Temperatura", pt: "Temperatura", en: "Temperature", fr: "Température" },
      description: {},
      groupKind: "choice",
      selectionMode: "single",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      sortOrder: 10,
      repeatPerUnit: false,
      linkSortOrder: 10,
      options: [
        {
          id: "fria",
          groupId: `synth-${productId}-drink-temp`,
          name: { es: "Fría / Gelada", pt: "Fria / Gelada", en: "Chilled", fr: "Fraîche" },
          priceDelta: 0,
          maxQty: 1,
          isDefault: true,
          sortOrder: 0,
        },
        {
          id: "natural",
          groupId: `synth-${productId}-drink-temp`,
          name: { es: "Natural", pt: "Natural", en: "Room temp", fr: "Température ambiante" },
          priceDelta: 0,
          maxQty: 1,
          isDefault: false,
          sortOrder: 1,
        },
      ],
    });
  }

  if (!hasIce) {
    out.push({
      id: `synth-${productId}-drink-ice`,
      storeId: "",
      name: { es: "Hielo", pt: "Gelo", en: "Ice", fr: "Glaçons" },
      description: {},
      groupKind: "choice",
      selectionMode: "single",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      sortOrder: 11,
      repeatPerUnit: false,
      linkSortOrder: 11,
      options: [
        {
          id: "con-hielo",
          groupId: `synth-${productId}-drink-ice`,
          name: { es: "Con hielo", pt: "Com gelo", en: "With ice", fr: "Avec glaçons" },
          priceDelta: 0,
          maxQty: 1,
          isDefault: true,
          sortOrder: 0,
        },
        {
          id: "sin-hielo",
          groupId: `synth-${productId}-drink-ice`,
          name: { es: "Sin hielo", pt: "Sem gelo", en: "No ice", fr: "Sans glaçons" },
          priceDelta: 0,
          maxQty: 1,
          isDefault: false,
          sortOrder: 1,
        },
      ],
    });
  }

  return out;
}

/** Bebidas: sem «quitar ingredientes», escolha de refresco, temperatura e gelo. */
export function adaptConfigForDrinkProduct(
  product: MenuProduct,
  config: ProductModifierConfig | null,
): ProductModifierConfig | null {
  if (!isDrinkProduct(product)) return config;

  const base: ProductModifierConfig = config ?? {
    productId: product.id,
    productType: "simple",
    comboUnitCount: 0,
    unitLabel: { es: "Unidad", pt: "Unidade", en: "Unit", fr: "Unité" },
    groups: [],
    hasStructuredModifiers: false,
  };

  let groups = (base.groups ?? []).filter((g) => g.groupKind !== "removal");

  groups = groups.map((g) => {
    const meatLabel = MEAT_LABEL_RE.test(groupLabel(g));
    const drinkOptions = optionLooksLikeDrink(g);
    if (g.groupKind === "choice" && (meatLabel || drinkOptions)) {
      return {
        ...g,
        name: {
          es: "Elige tu refresco",
          pt: "Escolhe o refresco",
          en: "Choose your drink",
          fr: "Choisissez votre boisson",
        },
        repeatPerUnit: false,
      };
    }
    return g;
  });

  groups = [...groups, ...synthDrinkPreferenceGroups(product.id, groups)];

  return {
    ...base,
    productType: "simple",
    comboUnitCount: 0,
    groups: sortModifierGroups(groups),
    hasStructuredModifiers: groups.length > 0,
  };
}
