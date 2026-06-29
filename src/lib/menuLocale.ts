import type { Category } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ProductModifierConfig } from "@/lib/modifiers/types";
import { pickSourceText, readLocalized, type AppLang } from "@/lib/localizedText";

export type LocalizedField = Record<string, string> | string | null | undefined;

export function menuItemNeedsTranslation(
  obj: LocalizedField,
  lang: AppLang,
  primaryLang: AppLang,
): boolean {
  if (lang === primaryLang) return false;
  if (typeof obj === "string") return Boolean(obj.trim());
  const record = readLocalized(obj);
  return !record[lang]?.trim();
}

export function collectTranslationSources(
  items: LocalizedField[],
  primaryLang: AppLang,
  lang: AppLang,
): string[] {
  if (lang === primaryLang) return [];
  const sources = new Set<string>();
  for (const item of items) {
    if (!menuItemNeedsTranslation(item, lang, primaryLang)) continue;
    const source = pickSourceText(item, primaryLang);
    if (source) sources.add(source);
  }
  return [...sources];
}

function pushField(bucket: LocalizedField[], value: LocalizedField) {
  if (value == null) return;
  if (typeof value === "string" && !value.trim()) return;
  if (typeof value === "object" && !Object.values(value).some((v) => typeof v === "string" && v.trim())) return;
  bucket.push(value);
}

export function collectMenuCatalogFields(
  categories: Pick<Category, "name">[],
  products: MenuProduct[],
): LocalizedField[] {
  const fields: LocalizedField[] = [];
  for (const category of categories) pushField(fields, category.name);
  for (const product of products) {
    pushField(fields, product.name);
    pushField(fields, product.description);
    pushField(fields, product.unitLabel);
    for (const extra of product.extras ?? []) pushField(fields, extra.name);
    for (const variant of product.variants ?? []) pushField(fields, variant.name);
  }
  return fields;
}

export function collectModifierConfigFields(config: ProductModifierConfig | null | undefined): LocalizedField[] {
  if (!config) return [];
  const fields: LocalizedField[] = [];
  pushField(fields, config.unitLabel);
  for (const group of config.groups ?? []) {
    pushField(fields, group.name);
    pushField(fields, group.description);
    for (const option of group.options ?? []) pushField(fields, option.name);
  }
  return fields;
}
