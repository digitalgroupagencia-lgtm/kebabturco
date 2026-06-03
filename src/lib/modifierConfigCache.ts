import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
import type { ModifierGroup, ModifierOption, ProductModifierConfig, ProductType } from "@/lib/modifiers/types";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";

const supabase = _supabaseRaw as unknown as any;

const cache = new Map<string, ProductModifierConfig>();
const inflight = new Map<string, Promise<void>>();
const prefetchedStores = new Set<string>();

const asName = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  return { es: "", pt: "", en: "", fr: "" };
};

export function getCachedModifierConfig(productId: string | undefined): ProductModifierConfig | null {
  if (!productId) return null;
  return cache.get(productId) ?? null;
}

export function setCachedModifierConfig(productId: string, config: ProductModifierConfig) {
  cache.set(productId, config);
}

export function trackInflightConfig(productId: string, promise: Promise<void>) {
  inflight.set(productId, promise);
  promise.finally(() => {
    if (inflight.get(productId) === promise) inflight.delete(productId);
  });
}

/** Bulk prefetch: 1 query por tabela para a loja inteira. */
export async function prefetchStoreModifierConfigs(storeId: string | null | undefined): Promise<void> {
  if (!storeId || prefetchedStores.has(storeId)) return;
  prefetchedStores.add(storeId);

  try {
    const prodsRes = await supabase
      .from("products")
      .select("id, product_type, combo_unit_count, unit_label")
      .eq("store_id", storeId)
      .eq("is_active", true);
    if (prodsRes.error || !prodsRes.data?.length) return;

    const productIds = prodsRes.data.map((p: any) => p.id);

    const [linksRes, groupsRes] = await Promise.all([
      supabase
        .from("product_modifier_groups")
        .select("product_id, group_id, sort_order, repeat_per_unit")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("modifier_groups")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true),
    ]);

    const groupIds = (groupsRes.data || []).map((g: any) => g.id);
    const optionsRes = groupIds.length
      ? await supabase
          .from("modifier_options")
          .select("*")
          .in("group_id", groupIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
      : { data: [] as any[], error: null };

    const groupsById = new Map<string, any>((groupsRes.data || []).map((g: any) => [g.id, g]));
    const optionsByGroup = new Map<string, ModifierOption[]>();
    for (const opt of optionsRes.data || []) {
      if (!groupsById.has(opt.group_id)) continue;
      const list = optionsByGroup.get(opt.group_id) || [];
      list.push({
        id: opt.id,
        groupId: opt.group_id,
        name: asName(opt.name),
        priceDelta: Number(opt.price_delta || 0),
        maxQty: opt.max_qty || 1,
        isDefault: opt.is_default ?? false,
        sortOrder: opt.sort_order ?? 0,
        imageUrl: opt.image_url ?? null,
      });
      optionsByGroup.set(opt.group_id, list);
    }

    const linksByProduct = new Map<string, any[]>();
    for (const link of linksRes.data || []) {
      const list = linksByProduct.get(link.product_id) || [];
      list.push(link);
      linksByProduct.set(link.product_id, list);
    }

    for (const prod of prodsRes.data) {
      const links = linksByProduct.get(prod.id) || [];
      const groups: ModifierGroup[] = links
        .map((link: any) => {
          const g = groupsById.get(link.group_id);
          if (!g) return null;
          return {
            id: g.id,
            storeId: g.store_id,
            name: asName(g.name),
            description: asName(g.description),
            groupKind: g.group_kind,
            selectionMode: g.selection_mode,
            minSelect: g.min_select ?? 0,
            maxSelect: g.max_select ?? 1,
            isRequired: g.is_required ?? false,
            sortOrder: link.sort_order ?? g.sort_order ?? 0,
            repeatPerUnit: link.repeat_per_unit ?? false,
            linkSortOrder: link.sort_order ?? 0,
            options: optionsByGroup.get(g.id) || [],
          } as ModifierGroup;
        })
        .filter(Boolean) as ModifierGroup[];

      cache.set(prod.id, {
        productId: prod.id,
        productType: (prod.product_type as ProductType) || "simple",
        comboUnitCount: Math.max(0, prod.combo_unit_count || 0),
        unitLabel: asName(prod.unit_label),
        groups: sortModifierGroups(groups),
        hasStructuredModifiers: groups.length > 0,
      });
    }
  } catch (err) {
    console.warn("[prefetchStoreModifierConfigs]", err);
    prefetchedStores.delete(storeId);
  }
}
