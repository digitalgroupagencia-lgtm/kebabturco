import type { MenuProduct } from "@/hooks/useMenuData";
import type { ModifierOption } from "./types";

function productLabel(product: MenuProduct): string {
  return `${product.name.es || ""} ${product.name.pt || ""} ${product.name.en || ""}`.toLowerCase();
}

export function findMenuProduct(menuProducts: MenuProduct[], patterns: RegExp[]): MenuProduct | undefined {
  return menuProducts.find((item) => {
    const label = productLabel(item);
    return patterns.some((re) => re.test(label));
  });
}

const MEAT_PATTERNS: Record<string, RegExp[]> = {
  pollo: [/pan.*pita.*pollo/i, /rollo.*pollo/i, /\bpollo\b/i],
  ternera: [/pan.*pita.*ternera/i, /rollo.*ternera/i, /\bternera\b/i],
  mixto: [/pan.*pita.*mixto/i, /rollo.*mixto/i, /\bmixto\b/i],
  kebab: [/pizza.*kebab/i, /\bkebab\b/i],
  mixta: [/pizza.*mixta/i, /\bmixta\b/i],
};

export function resolveMeatOptionImage(option: ModifierOption, menuProducts: MenuProduct[]): string | null {
  const key = `${option.id} ${option.name.es} ${option.name.pt}`.toLowerCase();
  for (const [meat, patterns] of Object.entries(MEAT_PATTERNS)) {
    if (!key.includes(meat)) continue;
    const match = findMenuProduct(menuProducts, patterns);
    if (match?.image) return match.image;
  }
  return null;
}

export function resolvePotatoOptionImage(option: ModifierOption, menuProducts: MenuProduct[]): string | null {
  const label = `${option.name.es} ${option.name.pt}`.toLowerCase();
  if (/bravas/.test(label)) {
    return findMenuProduct(menuProducts, [/patatas?\s*bravas/i, /bravas/i])?.image ?? null;
  }
  if (/lux|deluxe|especial/.test(label)) {
    return findMenuProduct(menuProducts, [/patatas?\s*(de\s*)?lux/i, /patatas?\s*deluxe/i, /patatas?\s*especial/i])?.image ?? null;
  }
  if (/fritas|incluid/.test(label)) {
    return findMenuProduct(menuProducts, [/patatas?\s*fritas/i, /^patatas fritas$/i])?.image ?? null;
  }
  return null;
}

export function resolveDrinkOptionImage(option: ModifierOption, menuProducts: MenuProduct[]): string | null {
  const byId = menuProducts.find((p) => p.id === option.id);
  if (byId?.image) return byId.image;

  const label = `${option.name.es || ""} ${option.name.pt || ""}`.toLowerCase().trim();
  if (!label) return null;

  const exact = menuProducts.find((p) => productLabel(p) === label);
  if (exact?.image) return exact.image;

  const partial = menuProducts.find((p) => {
    const pl = productLabel(p);
    return pl.includes(label) || label.includes(pl);
  });
  if (partial?.image) return partial.image;

  const brandPatterns: RegExp[] = [];
  if (/coca/i.test(label)) brandPatterns.push(/coca/i);
  if (/fanta/i.test(label)) brandPatterns.push(/fanta/i);
  if (/sprite/i.test(label)) brandPatterns.push(/sprite/i);
  if (/nestea/i.test(label)) brandPatterns.push(/nestea/i);
  if (/aquarius/i.test(label)) brandPatterns.push(/aquarius/i);

  for (const pattern of brandPatterns) {
    const wants2L = /2\s*l|2l/i.test(label);
    const wants33 = /33\s*cl|33cl|lata/i.test(label);
    const match = menuProducts.find((p) => {
      const pl = productLabel(p);
      if (!pattern.test(pl)) return false;
      if (wants2L) return /2\s*l|2l/i.test(pl);
      if (wants33) return /33\s*cl|33cl|lata/i.test(pl);
      return true;
    });
    if (match?.image) return match.image;
  }

  if (/2\s*l|2l|refresco|bebida/i.test(label)) {
    return findMenuProduct(menuProducts, [/coca.*2/i, /refresco.*2/i, /beb-coca/i, /bebida/i])?.image ?? null;
  }

  return null;
}

export function enrichOptionWithMenuImage(
  option: ModifierOption,
  menuProducts: MenuProduct[],
  groupKind: string,
  groupName: string,
): ModifierOption {
  if (option.imageUrl) return option;

  const groupLabel = `${groupName}`.toLowerCase();
  let imageUrl: string | null = null;

  if (/bebida|refresco|drink|boisson/i.test(groupLabel)) {
    imageUrl = resolveDrinkOptionImage(option, menuProducts);
  } else if (groupKind === "substitution" || /patata|acompa|side|batata/i.test(groupLabel)) {
    imageUrl = resolvePotatoOptionImage(option, menuProducts);
  } else if (/carne|meat|viande|pizza|sabor|flavor/i.test(groupLabel)) {
    imageUrl = resolveMeatOptionImage(option, menuProducts);
  }

  return imageUrl ? { ...option, imageUrl } : option;
}
