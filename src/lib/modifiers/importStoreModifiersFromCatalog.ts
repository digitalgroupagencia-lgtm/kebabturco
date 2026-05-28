import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;

import type { Extra } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import { inferChoiceVariantsFromDescription, inferVariantsFromText } from "@/lib/parseProductCustomization";
import { normalizeProductClassification } from "@/lib/modifiers/productClassification";
import { safeHasFixedProtein } from "@/lib/modifiers/safeCustomization";
import { synthesizeModifierConfigFromProduct } from "@/lib/modifiers/synthesizeConfig";
import type { ModifierGroup, ModifierOption } from "@/lib/modifiers/types";

export type ImportStoreModifiersResult = {
  groupsCreated: number;
  optionsCreated: number;
  linksCreated: number;
  productsScanned: number;
};

const asName = (value: unknown, fallback = ""): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  return { pt: fallback, es: fallback, en: fallback, fr: fallback };
};

const isRemovalModifier = (extra: Extra) => {
  const label = (extra.name.es || extra.name.pt || extra.name.en || "").toLowerCase().trim();
  return /^(sin|sem|no|sans)\s+/.test(label);
};

const ingredientFromModifier = (extra: Extra) => {
  const label = extra.name.es || extra.name.pt || extra.name.en || extra.name.fr || "";
  return label.replace(/^(sin|sem|no|sans)\s+/i, "").trim();
};

function groupRegistryKey(group: ModifierGroup): string {
  const label = (group.name.pt || group.name.es || group.name.en || "").toLowerCase().trim();
  return `${group.groupKind}|${label}`;
}

function optionRegistryKey(groupId: string, option: ModifierOption): string {
  const label = (option.name.pt || option.name.es || option.name.en || "").toLowerCase().trim();
  return `${groupId}|${label}|${option.priceDelta}|${option.maxQty}`;
}

async function fetchMenuProductsForStore(storeId: string): Promise<MenuProduct[]> {
  const [catRes, prodRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, image_url")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order, price_modifiers, product_type, combo_unit_count, unit_label, after_add_suggestions",
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (prodRes.error) throw prodRes.error;
  if (!prodRes.data?.length) return [];

  const categoryImage = new Map(
    (catRes.data ?? []).map((cat: { id: string; image_url: string | null }) => [cat.id, cat.image_url || ""]),
  );

  return prodRes.data.map((prod: Record<string, unknown>) => {
    const modifiers = Array.isArray(prod.price_modifiers) ? prod.price_modifiers : [];
    const allExtras = modifiers.map((modifier: Record<string, unknown>, index: number) => ({
      id: (modifier.id as string) || `modifier-${index}`,
      name: asName(modifier.name),
      price: Number(modifier.price || 0),
    })) as Extra[];

    const name = asName(prod.name);
    const description = asName(prod.description);
    const descText = description.es || description.pt || description.en || "";
    const nameText = name.es || name.pt || name.en || "";
    const inferredMeat = inferVariantsFromText(descText) || inferVariantsFromText(nameText);
    const inferredChoice =
      inferredMeat.length >= 2
        ? []
        : inferChoiceVariantsFromDescription(descText) || inferChoiceVariantsFromDescription(nameText);
    const inferredVariants = inferredMeat.length >= 2 ? inferredMeat : inferredChoice;

    const draftProduct = {
      id: prod.id as string,
      name,
      description,
      price: Number(prod.price || 0),
      image: (prod.image_url as string) || (categoryImage.get(prod.category_id as string) as string) || "",
      category: prod.category_id as string,
      categorySlug: "",
      isBestseller: Boolean(prod.is_bestseller),
      isPromo: Boolean(prod.is_promo),
      extras: allExtras.filter((extra) => !isRemovalModifier(extra)),
      ingredients: allExtras.filter(isRemovalModifier).map(ingredientFromModifier).filter(Boolean),
      variants: inferredVariants.length >= 2 ? inferredVariants : undefined,
      productType: (prod.product_type as "simple" | "combo") || undefined,
      comboUnitCount: Number(prod.combo_unit_count || 0) || undefined,
      unitLabel: asName(prod.unit_label),
      afterAddSuggestions: Array.isArray(prod.after_add_suggestions)
        ? (prod.after_add_suggestions as string[])
        : [],
    } satisfies MenuProduct;

    const classified = normalizeProductClassification(draftProduct);
    const normalizedProduct = {
      ...draftProduct,
      productType: classified.productType,
      comboUnitCount: classified.comboUnitCount,
    };
    const variants = safeHasFixedProtein(normalizedProduct) ? undefined : normalizedProduct.variants;
    return { ...normalizedProduct, variants };
  });
}

/** Importa personalizações que já funcionam no site para grupos editáveis no admin. */
export async function importStoreModifiersFromCatalog(
  storeId: string,
  options?: { replaceExisting?: boolean },
): Promise<ImportStoreModifiersResult> {
  const replaceExisting = options?.replaceExisting ?? false;

  const { count: existingGroups, error: countError } = await supabase
    .from("modifier_groups")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (countError) throw countError;

  if ((existingGroups ?? 0) > 0 && !replaceExisting) {
    throw new Error("Esta unidade já tem grupos de personalização.");
  }

  if (replaceExisting && (existingGroups ?? 0) > 0) {
    const { error: deleteError } = await supabase.from("modifier_groups").delete().eq("store_id", storeId);
    if (deleteError) throw deleteError;
  }

  const menuProducts = await fetchMenuProductsForStore(storeId);
  if (!menuProducts.length) {
    throw new Error("Não há produtos no cardápio desta unidade para importar.");
  }

  const groupIdByKey = new Map<string, string>();
  const optionIdByKey = new Map<string, string>();
  const linkKeys = new Set<string>();

  let groupsCreated = 0;
  let optionsCreated = 0;
  let linksCreated = 0;

  for (const product of menuProducts) {
    const config = synthesizeModifierConfigFromProduct(product, menuProducts);
    if (!config?.groups.length) continue;

    for (const group of config.groups) {
      const registryKey = groupRegistryKey(group);
      let dbGroupId = groupIdByKey.get(registryKey);

      if (!dbGroupId) {
        const { data: insertedGroup, error: groupError } = await supabase
          .from("modifier_groups")
          .insert({
            store_id: storeId,
            name: group.name,
            description: group.description ?? {},
            group_kind: group.groupKind,
            selection_mode: group.selectionMode,
            min_select: group.minSelect,
            max_select: group.maxSelect,
            is_required: group.isRequired,
            is_active: true,
            sort_order: group.sortOrder,
          })
          .select("id")
          .single();

        if (groupError) throw groupError;
        dbGroupId = insertedGroup.id as string;
        groupIdByKey.set(registryKey, dbGroupId);
        groupsCreated += 1;
      }

      for (const option of group.options) {
        const optionKey = optionRegistryKey(dbGroupId, option);
        if (optionIdByKey.has(optionKey)) continue;

        const { data: insertedOption, error: optionError } = await supabase
          .from("modifier_options")
          .insert({
            group_id: dbGroupId,
            name: option.name,
            price_delta: option.priceDelta,
            max_qty: option.maxQty,
            is_default: option.isDefault,
            is_active: true,
            sort_order: option.sortOrder,
          })
          .select("id")
          .single();

        if (optionError) throw optionError;
        optionIdByKey.set(optionKey, insertedOption.id as string);
        optionsCreated += 1;
      }

      const linkKey = `${product.id}|${dbGroupId}`;
      if (linkKeys.has(linkKey)) continue;

      const { error: linkError } = await supabase.from("product_modifier_groups").insert({
        product_id: product.id,
        group_id: dbGroupId,
        sort_order: group.linkSortOrder ?? group.sortOrder,
        repeat_per_unit: group.repeatPerUnit,
      });

      if (linkError) throw linkError;
      linkKeys.add(linkKey);
      linksCreated += 1;
    }
  }

  if (groupsCreated === 0) {
    throw new Error("Nenhuma personalização encontrada no cardápio desta unidade.");
  }

  return {
    groupsCreated,
    optionsCreated,
    linksCreated,
    productsScanned: menuProducts.length,
  };
}
