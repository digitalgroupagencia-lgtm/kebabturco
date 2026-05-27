import type { Category } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";

type MenuSnapshot = {
  categories: Category[];
  products: MenuProduct[];
  savedAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, MenuSnapshot>();

export function readMenuCache(storeId: string): MenuSnapshot | null {
  const hit = cache.get(storeId);
  if (!hit) return null;
  if (Date.now() - hit.savedAt > TTL_MS) {
    cache.delete(storeId);
    return null;
  }
  return hit;
}

export function writeMenuCache(storeId: string, categories: Category[], products: MenuProduct[]) {
  cache.set(storeId, { categories, products, savedAt: Date.now() });
}
