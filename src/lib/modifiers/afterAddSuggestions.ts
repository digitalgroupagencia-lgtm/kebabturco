import type { Category } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import { resolveIsComboProduct } from "@/lib/modifiers/productClassification";
import { isDrinkProduct } from "@/lib/modifiers/drinkProduct";

function categoryMatches(category: Category | undefined, pattern: RegExp): boolean {
  if (!category) return false;
  return pattern.test(Object.values(category.name).join(" "));
}

function productName(product: MenuProduct): string {
  return Object.values(product.name).join(" ").toLowerCase();
}

/** Sugestões pós-adicionar: configuradas no produto ou heurística simples. */
export function resolveAfterAddSuggestions(
  product: MenuProduct,
  allProducts: MenuProduct[],
  categories: Category[],
  excludeIds: Set<string> = new Set(),
): MenuProduct[] {
  const configured = product.afterAddSuggestions?.filter(Boolean) ?? [];
  if (configured.length > 0) {
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    return configured
      .map((id) => byId.get(id))
      .filter((p): p is MenuProduct => Boolean(p) && !excludeIds.has(p!.id));
  }

  const drinkCategoryIds = categories
    .filter((c) => categoryMatches(c, /bebida|drink|boisson|refresco/i))
    .map((c) => c.id);
  const dessertCategoryIds = categories
    .filter((c) => categoryMatches(c, /postre|sobremesa|dessert|baklava|helado/i))
    .map((c) => c.id);

  const drinks = allProducts.filter(
    (p) => drinkCategoryIds.includes(p.category) && !excludeIds.has(p.id) && isDrinkProduct(p),
  );
  const desserts = allProducts.filter(
    (p) => dessertCategoryIds.includes(p.category) && !excludeIds.has(p.id),
  );
  const extras = allProducts.filter(
    (p) =>
      !excludeIds.has(p.id) &&
      (p.extras?.length ?? 0) > 0 &&
      !drinkCategoryIds.includes(p.category) &&
      !dessertCategoryIds.includes(p.category) &&
      p.price > 0 &&
      p.price < 6,
  );

  const name = productName(product);
  const isCombo = resolveIsComboProduct(product);
  const isKebabLike = /kebab|pita|rollo|durum|dürüm|wrap/i.test(name);
  const isKids = /infantil|niño|kids|menu ni/i.test(name);

  if (isCombo) {
    return [...desserts, ...drinks].slice(0, 4);
  }
  if (isKebabLike || isKids) {
    return drinks.slice(0, 4);
  }
  if (/burger|hamburg/i.test(name)) {
    return [...drinks, ...extras].slice(0, 4);
  }
  return allProducts.filter((p) => p.isBestseller && !excludeIds.has(p.id)).slice(0, 3);
}

export function afterAddSuggestionTitle(product: MenuProduct, categories: Category[]): string {
  if (product.afterAddSuggestions?.length) return "";
  const name = productName(product);
  if (resolveIsComboProduct(product)) return "¿Algo para acompañar?";
  if (/kebab|pita|rollo|durum|burger|hamburg/i.test(name)) return "¿Quieres bebida?";
  return "¿Te apetece algo más?";
}
