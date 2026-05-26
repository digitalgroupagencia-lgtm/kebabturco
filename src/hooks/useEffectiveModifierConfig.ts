import { useEffect, useMemo, useState } from "react";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as unknown as any;
import type { MenuProduct } from "@/hooks/useMenuData";
import { useProductModifierConfig } from "@/hooks/useProductModifierConfig";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import type { ModifierGroup, ModifierOption, ProductModifierConfig } from "@/lib/modifiers/types";
import {
  mergeStoreGroupsForCombo,
  synthesizeModifierConfigFromProduct,
} from "@/lib/modifiers/synthesizeConfig";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";
import { sanitizeProductModifierConfig } from "@/lib/modifiers/sanitizeGroups";

const asName = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  return { es: "", pt: "", en: "", fr: "" };
};

async function fetchStoreModifierGroups(storeId: string): Promise<ModifierGroup[]> {
  const { data: groups } = await supabase
    .from("modifier_groups")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order");

  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: options } = await supabase
    .from("modifier_options")
    .select("*")
    .in("group_id", groupIds)
    .eq("is_active", true)
    .order("sort_order");

  const optionsByGroup = new Map<string, ModifierOption[]>();
  for (const opt of options || []) {
    const list = optionsByGroup.get(opt.group_id) || [];
    list.push({
      id: opt.id,
      groupId: opt.group_id,
      name: asName(opt.name),
      priceDelta: Number(opt.price_delta || 0),
      maxQty: opt.max_qty || 1,
      isDefault: opt.is_default ?? false,
      sortOrder: opt.sort_order ?? 0,
    });
    optionsByGroup.set(opt.group_id, list);
  }

  return groups
    .map((g) => ({
      id: g.id,
      storeId: g.store_id,
      name: asName(g.name),
      description: asName(g.description),
      groupKind: g.group_kind as ModifierGroup["groupKind"],
      selectionMode: g.selection_mode as ModifierGroup["selectionMode"],
      minSelect: g.min_select ?? 0,
      maxSelect: g.max_select ?? 1,
      isRequired: g.is_required ?? false,
      sortOrder: g.sort_order ?? 0,
      repeatPerUnit: false,
      linkSortOrder: g.sort_order ?? 0,
      options: optionsByGroup.get(g.id) || [],
    }))
    .filter((g) => g.options.length > 0);
}

/** Configuração efectiva: grupos ligados na BD → senão dados do produto → senão grupos da loja (combos). */
export function useEffectiveModifierConfig(product: MenuProduct | undefined) {
  const { config: dbConfig, loading: dbLoading } = useProductModifierConfig(product?.id);
  const { storeId } = useResolvedStore();
  const [storeGroups, setStoreGroups] = useState<ModifierGroup[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    if (!storeId || dbConfig?.hasStructuredModifiers) {
      setStoreGroups([]);
      return;
    }
    let active = true;
    setStoreLoading(true);
    fetchStoreModifierGroups(storeId).then((groups) => {
      if (active) {
        setStoreGroups(groups);
        setStoreLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [storeId, dbConfig?.hasStructuredModifiers]);

  const config = useMemo((): ProductModifierConfig | null => {
    const finalize = (cfg: ProductModifierConfig | null) =>
      cfg ? sanitizeProductModifierConfig(cfg) : null;

    if (!product) return finalize(dbConfig);

    const synthesized = synthesizeModifierConfigFromProduct(product);

    if (dbConfig?.hasStructuredModifiers) {
      const hasRemoval = dbConfig.groups.some((g) => g.groupKind === "removal");
      const synthRemoval = synthesized?.groups.filter((g) => g.groupKind === "removal") || [];
      if (!hasRemoval && synthRemoval.length) {
        return finalize({
          ...dbConfig,
          groups: sortModifierGroups([...dbConfig.groups, ...synthRemoval]),
        });
      }
      return finalize(dbConfig);
    }

    if (synthesized?.hasStructuredModifiers) return finalize(synthesized);

    if (synthesized?.productType === "combo" && storeGroups.length) {
      const merged = mergeStoreGroupsForCombo(
        {
          ...synthesized,
          groups: [],
          hasStructuredModifiers: false,
        },
        storeGroups,
      );
      if (merged.hasStructuredModifiers) return finalize(merged);
    }

    return finalize(synthesized ?? dbConfig);
  }, [product, dbConfig, storeGroups]);

  const loading = dbLoading || storeLoading;

  return {
    config,
    loading,
    hasStructuredModifiers: Boolean(config?.hasStructuredModifiers),
  };
}
