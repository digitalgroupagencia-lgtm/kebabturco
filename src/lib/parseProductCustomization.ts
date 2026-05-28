import type { Variant } from "@/data/products";

const VARIANT_DEFS: Record<string, Variant> = {
  pollo: { id: "pollo", name: { es: "Pollo", en: "Chicken", pt: "Frango", fr: "Poulet" } },
  ternera: { id: "ternera", name: { es: "Ternera", en: "Beef", pt: "Vaca", fr: "Bœuf" } },
  mixto: { id: "mixto", name: { es: "Mixto", en: "Mixed", pt: "Misto", fr: "Mixte" } },
};

/** Detecta escolhas obrigatórias tipo "pollo o ternera o mixto" na descrição ou nome. */
export function inferVariantsFromText(text: string): Variant[] {
  if (!text || !/\s+o\s+/i.test(text)) return [];

  const lower = text.toLowerCase();
  const found: Variant[] = [];

  if (/\bpollo\b/.test(lower)) found.push(VARIANT_DEFS.pollo);
  if (/\bternera\b/.test(lower)) found.push(VARIANT_DEFS.ternera);
  if (/\bmixto\b/.test(lower)) found.push(VARIANT_DEFS.mixto);

  return found.length >= 2 ? found : [];
}

function isMeatChoiceSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  return /\s+o\s+/.test(lower) && /\b(pollo|ternera|mixto)\b/.test(lower);
}

export function isMeatChoiceLabel(label: string): boolean {
  return isMeatChoiceSegment(label);
}

/** Ingredientes que o cliente pode remover (sem grupos "X o Y o Z"). */
export function parseRemovableIngredients(description: string, skipGenericCarne = false): string[] {
  if (!description) return [];

  const lower = description.toLowerCase();
  if (
    /\bcombo\b|\bmen[uú]\b/.test(lower) ||
    /\d+\s*(pan\s*)?(pita|rollo|pizza)/i.test(lower) ||
    /\+\s*patatas|bebida\s*\d/i.test(lower)
  ) {
    return [];
  }

  const normalized = description
    .replace(/\s+(?:y|e|and|et)\s+/gi, ", ")
    .replace(/\s*\.\s*$/, "");

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of normalized.split(",")) {
    const segment = raw.trim();
    if (!segment || isMeatChoiceSegment(segment)) continue;
    if (skipGenericCarne && /^carne$/i.test(segment)) continue;

    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    const key = label.toLowerCase();
    if (seen.has(key) || label.length > 48) continue;
    seen.add(key);
    out.push(label);
  }

  const conSuffix = description.match(/\s+con\s+(.+)$/i);
  if (conSuffix) {
    for (const raw of conSuffix[1].split(/\s+(?:y|e|and|et)\s+/i)) {
      const segment = raw.trim();
      if (!segment || isMeatChoiceSegment(segment)) continue;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      const key = label.toLowerCase();
      if (!seen.has(key) && label.length <= 48) {
        seen.add(key);
        out.push(label);
      }
    }
  }

  return out;
}

export function mergeRemovableIngredients(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}

const TYPICAL_REMOVABLE =
  /lechuga|col\b|tomate|pepino|cebolla|ma[ií]z|zanahoria|salsa|queso|or[eé]gano|aceituna|bacon|huevo|pan\b|patata|arroz|ajo|miel|champi/i;

const MEAT_VARIANT_IDS = new Set(["pollo", "ternera", "mixto"]);

function slugifyChoiceId(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "choice"
  );
}

/** Detecta escolha única obrigatória tipo "Coca-Cola, Fanta, Sprite, Nestea" na descrição. */
export function inferChoiceVariantsFromDescription(text: string): Variant[] {
  if (!text || /\s+o\s+/i.test(text)) return [];

  const segments = text
    .replace(/\s*\.\s*$/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) return [];
  if (segments.some((s) => isMeatChoiceSegment(s) || TYPICAL_REMOVABLE.test(s))) return [];

  return segments.map((label) => {
    const normalized = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      id: slugifyChoiceId(normalized),
      name: { es: normalized, en: normalized, pt: normalized, fr: normalized },
    };
  });
}

export function isMeatVariantSet(variants: Variant[]): boolean {
  return variants.length >= 2 && variants.every((v) => MEAT_VARIANT_IDS.has(v.id));
}
