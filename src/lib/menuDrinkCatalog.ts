import type { MenuProduct } from "@/hooks/useMenuData";
import { isCustomerMenuDrink, isDrinkProduct, isGenericDrinkPlaceholder } from "@/lib/modifiers/drinkProduct";

type NamedCategory = {
  id: string;
  name: unknown;
};

export function categoryLabel(category: NamedCategory): string {
  const name = asLocalizedName(category.name);
  return `${name.es || ""} ${name.pt || ""} ${name.en || ""}`.toLowerCase();
}

export function isBebidasCategory(category: NamedCategory): boolean {
  return /bebida|drink|boisson|refresco/i.test(categoryLabel(category));
}

export function findBebidasCategoryId(categories: NamedCategory[]): string | null {
  return categories.find(isBebidasCategory)?.id ?? null;
}

/** Todas as bebidas concretas do cardápio (sem placeholders «Refresco Lata/Botella»). */
export function listCustomerDrinkProducts(products: MenuProduct[]): MenuProduct[] {
  const seen = new Set<string>();
  const merged: MenuProduct[] = [];
  for (const product of products) {
    if (!isCustomerMenuDrink(product)) continue;
    if (!seen.has(product.id)) {
      seen.add(product.id);
      merged.push(product);
    }
  }
  return merged;
}

/**
 * Na categoria Bebidas, mostra marcas e tamanhos concretos (Coca-Cola 2L, Fanta Lata…),
 * não os placeholders genéricos «Refresco Botella/Lata».
 */
export function filterProductsForCategory(
  products: MenuProduct[],
  categories: NamedCategory[],
  activeCategoryId: string,
): MenuProduct[] {
  const bebidasId = findBebidasCategoryId(categories);
  if (!bebidasId || activeCategoryId !== bebidasId) {
    return products.filter((product) => product.category === activeCategoryId);
  }

  return listCustomerDrinkProducts(products);
}

/** Oculta placeholders genéricos em listagens do cliente (ex.: mais vendidos). */
export function isCustomerMenuProduct(product: MenuProduct): boolean {
  if (!isDrinkProduct(product)) return true;
  return !isGenericDrinkPlaceholder(product);
}

function asLocalizedName(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return { es: "", pt: "", en: "", fr: "" };
}

/** Converte linha do painel/admin para validar regras de bebida genérica. */
export function asMenuProductFromPanelRow(product: {
  id: string;
  category_id: string;
  name: unknown;
  description?: unknown;
  image_url?: string | null;
  price?: number | string | null;
  is_bestseller?: boolean | null;
  is_promo?: boolean | null;
  sort_order?: number | null;
}): MenuProduct {
  return {
    id: product.id,
    name: asLocalizedName(product.name),
    description: asLocalizedName(product.description),
    price: Number(product.price || 0),
    image: product.image_url || "",
    category: product.category_id,
    categorySlug: "",
    isBestseller: Boolean(product.is_bestseller),
    isPromo: Boolean(product.is_promo),
    sortOrder: product.sort_order ?? 0,
    extras: [],
    ingredients: [],
  } as MenuProduct;
}

/**
 * No painel (admin/restaurante), na categoria Bebidas mostra só marcas reais
 * (Coca-Cola 2L, Fanta Lata…), igual ao menu do cliente.
 */
export function filterPanelProductsForCategory<T extends { id: string; category_id: string; name: unknown; description?: unknown; image_url?: string | null; price?: number | string | null; is_bestseller?: boolean | null; is_promo?: boolean | null; sort_order?: number | null }>(
  products: T[],
  categories: NamedCategory[],
  activeCategoryId: string,
): T[] {
  const bebidasId = findBebidasCategoryId(categories);
  if (!bebidasId || activeCategoryId !== bebidasId) return products;
  return products.filter((product) => !isGenericDrinkPlaceholder(asMenuProductFromPanelRow(product)));
}

export function countHiddenGenericDrinks<T extends { id: string; category_id: string; name: unknown; description?: unknown }>(
  products: T[],
  categories: NamedCategory[],
  activeCategoryId: string,
): number {
  const bebidasId = findBebidasCategoryId(categories);
  if (!bebidasId || activeCategoryId !== bebidasId) return 0;
  return products.filter((product) => isGenericDrinkPlaceholder(asMenuProductFromPanelRow(product))).length;
}
