import type { MenuProduct } from "@/hooks/useMenuData";
import { isDrinkProduct } from "./drinkProduct";

export function normalizeProductLabel(name: Record<string, string>): string {
  return `${name.es || ""} ${name.pt || ""} ${name.en || ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isWeakProductImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  return /placeholder|product-default|via\.placeholder|product-placeholder/i.test(url);
}

function nameSimilarity(target: string, candidate: string): number {
  if (target === candidate) return 100;
  let score = 0;
  const tokens = target.split(/[\s\-–, ]+/).filter((t) => t.length > 2);
  for (const token of tokens) {
    if (candidate.includes(token)) score += token.length;
  }
  if (/33|lata/.test(target) && /33|lata/.test(candidate)) score += 6;
  if (/peque|pequen/.test(target) && /peque|pequen/.test(candidate)) score += 6;
  if (/grande|grand/.test(target) && /grande|grand/.test(candidate)) score += 6;
  if (/zumo|frutas/.test(target) && /zumo|frutas/.test(candidate)) score += 6;
  if (/agua|water/.test(target) && /agua|water/.test(candidate)) score += 4;
  if (/refresco|cola|coca|fanta|sprite|nestea/.test(target) && /refresco|cola|coca|fanta|sprite|nestea/.test(candidate)) {
    score += 4;
  }
  if (/peque|pequen/.test(target) && !/peque|pequen/.test(candidate)) score = 0;
  if (/grande|grand/.test(target) && !/grande|grand/.test(candidate)) score = 0;
  return score;
}

function resolveDrinkDisplayImage(product: MenuProduct, menuProducts: MenuProduct[]): string | null {
  const drinks = menuProducts.filter(isDrinkProduct);
  const label = normalizeProductLabel(product.name);
  const withImages = drinks.filter((d) => d.image && !isWeakProductImage(d.image));

  const imageOwners = new Map<string, MenuProduct[]>();
  for (const drink of withImages) {
    const list = imageOwners.get(drink.image!) || [];
    list.push(drink);
    imageOwners.set(drink.image!, list);
  }

  const catalogProduct = drinks.find((d) => d.id === product.id) ?? product;

  if (catalogProduct.image && !isWeakProductImage(catalogProduct.image)) {
    const group = imageOwners.get(catalogProduct.image) || [];
    if (group.length === 1) return catalogProduct.image;
  }

  const ranked = withImages
    .filter((d) => {
      const group = imageOwners.get(d.image!) || [];
      return group.length === 1;
    })
    .map((d) => ({
      d,
      score: nameSimilarity(label, normalizeProductLabel(d.name)),
    }))
    .filter((row) => row.score >= 4)
    .sort((a, b) => {
      if (a.d.id === product.id) return -1;
      if (b.d.id === product.id) return 1;
      return b.score - a.score;
    });

  if (ranked[0]?.d.image) return ranked[0].d.image;

  if (catalogProduct.image && !isWeakProductImage(catalogProduct.image)) {
    const group = imageOwners.get(catalogProduct.image) || [];
    if (group.length === 1) return catalogProduct.image;
  }

  return null;
}

/** Foto coerente com o cardápio, evita repetir a mesma imagem errada em bebidas diferentes. */
export function resolveMenuProductDisplayImage(
  product: MenuProduct,
  menuProducts: MenuProduct[] = [],
): string {
  const pool = menuProducts.length > 0 ? menuProducts : [product];

  if (isDrinkProduct(product)) {
    const drinkImage = resolveDrinkDisplayImage(product, pool);
    return drinkImage || "/product-placeholder.svg";
  }

  const catalog =
    pool.find((p) => p.id === product.id) ??
    pool.find((p) => normalizeProductLabel(p.name) === normalizeProductLabel(product.name));

  const own = catalog?.image || product.image;
  if (own && !isWeakProductImage(own)) return own;

  return "/product-placeholder.svg";
}
