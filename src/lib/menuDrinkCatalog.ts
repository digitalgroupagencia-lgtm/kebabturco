import type { MenuProduct } from "@/hooks/useMenuData";
import { isDrinkProduct } from "@/lib/modifiers/drinkProduct";

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

/**
 * Na categoria Bebidas, mostra todas as bebidas do cardápio (incluindo as usadas em combos).
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

  const seen = new Set<string>();
  const merged: MenuProduct[] = [];
  for (const product of products) {
    if (product.category !== bebidasId && !isDrinkProduct(product)) continue;
    if (!seen.has(product.id)) {
      seen.add(product.id);
      merged.push(product);
    }
  }
  return merged;
}
