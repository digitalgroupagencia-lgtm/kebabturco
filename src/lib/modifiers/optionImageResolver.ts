import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierOption } from "./types";
import { parseProductCode } from "@/lib/parseProductCode";
import { isWeakProductImage, normalizeProductLabel } from "./productDisplayImage";
import { resolveDrinkOptionImage } from "./optionCatalog";

/**
 * Resolve a imagem ideal para uma opção de modificador.
 * Tenta, em ordem:
 *   1. opt.imageUrl (se forte)
 *   2. bebida/patata/carne via catálogo
 *   3. produto do cardápio com o mesmo código numérico (ex.: "21")
 *   4. produto do cardápio com nome similar
 */
export function resolveModifierOptionImage(
  opt: ModifierOption,
  menuProducts: MenuProduct[] = [],
  tName?: (n: Record<string, string>) => string,
): string | null {
  if (opt.imageUrl && !isWeakProductImage(opt.imageUrl)) return opt.imageUrl;
  if (!menuProducts.length) return opt.imageUrl ?? null;

  const rawName = tName ? tName(opt.name) : opt.name.es || opt.name.pt || opt.name.en || "";
  if (/coca|fanta|sprite|nestea|aquarius|refresco|bebida|agua|2\s*l|33\s*cl|lata/i.test(rawName)) {
    const drinkImage = resolveDrinkOptionImage(opt, menuProducts);
    if (drinkImage && !isWeakProductImage(drinkImage)) return drinkImage;
  }
  const { code, name: cleanName } = parseProductCode(rawName);

  if (code) {
    for (const p of menuProducts) {
      const productRaw = p.name.es || p.name.pt || p.name.en || "";
      const { code: pCode } = parseProductCode(productRaw);
      if (pCode && pCode.toLowerCase() === code.toLowerCase()) {
        if (p.image && !isWeakProductImage(p.image)) return p.image;
      }
    }
  }

  const targetLabel = normalizeProductLabel({ es: cleanName, pt: cleanName, en: cleanName });
  if (targetLabel.length >= 3) {
    let best: { image: string; score: number } | null = null;
    for (const p of menuProducts) {
      if (!p.image || isWeakProductImage(p.image)) continue;
      const candidate = normalizeProductLabel(p.name);
      if (candidate === targetLabel) return p.image;
      const tokens = targetLabel.split(/\s+/).filter((tk) => tk.length > 2);
      let score = 0;
      for (const tk of tokens) if (candidate.includes(tk)) score += tk.length;
      if (score >= 4 && (!best || score > best.score)) best = { image: p.image, score };
    }
    if (best) return best.image;
  }

  return opt.imageUrl ?? null;
}
