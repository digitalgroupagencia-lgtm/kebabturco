import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierGroup, ProductModifierConfig } from "./types";
import { sortModifierGroups } from "./groupOrder";
import { isDrinkProduct } from "./drinkProduct";

const SANDWICH_CATEGORY_RE =
  /sandu|sandw|bocadi|durum|d[üu]r[üu]m|pita|kebab|wrap|rollo|hamburg|burger|burgu|plato|combinad|men[uú]|box|crispy|pollo/i;
const SANDWICH_NAME_RE =
  /sandu|sandw|bocadi|durum|d[üu]r[üu]m|pita|kebab|wrap|rollo|hamburg|burger|burgu|plato|combinad|men[uú]\b|\bbox\b|crispy|pollo/i;
const EXCLUDE_CATEGORY_RE = /ensalad|salad|patata|fries|chips|bebid|drink|boisson|refresc|postre|dessert|salsa|sauce|molho/i;
const EXCLUDE_NAME_RE = /^(ensalad|salad|patata|fries|chips|salsa|sauce|molho|postre|dessert)/i;

/** Detecta sanduíches/wraps/kebabs/durum/hamburguer/platos/menús/box/crispy. */
export function isSandwichProduct(product: MenuProduct | undefined): boolean {
  if (!product) return false;
  if (isDrinkProduct(product)) return false;
  const cat = `${product.category || ""} ${product.categorySlug || ""}`.toLowerCase();
  const text = `${product.name?.es || ""} ${product.name?.pt || ""} ${product.name?.en || ""}`.toLowerCase();
  if (EXCLUDE_CATEGORY_RE.test(cat) && !SANDWICH_CATEGORY_RE.test(cat)) return false;
  if (EXCLUDE_NAME_RE.test(text.trim())) return false;
  if (SANDWICH_CATEGORY_RE.test(cat)) return true;
  return SANDWICH_NAME_RE.test(text);
}


function groupLabel(group: ModifierGroup): string {
  return `${group.name.es || ""} ${group.name.pt || ""} ${group.name.en || ""}`.toLowerCase();
}

/** Adiciona grupo «¿Picante?» obrigatório (Sí/No) em sanduíches. */
export function adaptConfigForSandwichSpicy(
  product: MenuProduct | undefined,
  config: ProductModifierConfig | null,
): ProductModifierConfig | null {
  if (!product || !config) return config;
  if (!isSandwichProduct(product)) return config;

  const groups = config.groups ?? [];
  const hasSpicy = groups.some((g) => /picant|spicy|piquant|picante|spice/i.test(groupLabel(g)));
  if (hasSpicy) return config;

  const synthId = `synth-${product.id}-spicy`;
  const spicyGroup: ModifierGroup = {
    id: synthId,
    storeId: "",
    name: { es: "¿Picante?", pt: "Picante?", en: "Spicy?", fr: "Épicé ?" },
    description: {},
    groupKind: "choice",
    selectionMode: "single",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    sortOrder: 5,
    repeatPerUnit: false,
    linkSortOrder: 5,
    options: [
      {
        id: `${synthId}-no`,
        groupId: synthId,
        name: { es: "Sin picante", pt: "Sem picante", en: "No spicy", fr: "Sans piquant" },
        priceDelta: 0,
        maxQty: 1,
        isDefault: true,
        sortOrder: 0,
      },
      {
        id: `${synthId}-yes`,
        groupId: synthId,
        name: { es: "Con picante", pt: "Com picante", en: "Spicy", fr: "Piquant" },
        priceDelta: 0,
        maxQty: 1,
        isDefault: false,
        sortOrder: 1,
      },
    ],
  };

  return {
    ...config,
    groups: sortModifierGroups([...groups, spicyGroup]),
    hasStructuredModifiers: true,
  };
}
