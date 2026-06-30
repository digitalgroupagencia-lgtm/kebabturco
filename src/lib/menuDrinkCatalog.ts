import type { MenuProduct } from "@/hooks/useMenuData";
import { isCustomerMenuDrink, isDrinkProduct, isGenericDrinkPlaceholder } from "@/lib/modifiers/drinkProduct";

type NamedCategory = {
  id: string;
  name: Record<string, string>;
};

export function categoryLabel(category: NamedCategory): string {
  return `${category.name.es || ""} ${category.name.pt || ""} ${category.name.en || ""}`.toLowerCase();
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
