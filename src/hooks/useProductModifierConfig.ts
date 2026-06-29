import { useEffect, useState } from "react";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import type { ModifierGroup, ModifierOption, ProductModifierConfig, ProductType } from "@/lib/modifiers/types";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";
import { getCachedModifierConfig, setCachedModifierConfig } from "@/lib/modifierConfigCache";

const asName = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
  return { es: "", pt: "", en: "", fr: "" };
};

const emptyConfig = (productId: string): ProductModifierConfig => ({
  productId,
  productType: "simple",
  comboUnitCount: 0,
  unitLabel: { es: "Unidad", pt: "Unidade", en: "Unit" },
  groups: [],
  hasStructuredModifiers: false,
});

export function useProductModifierConfig(productId: string | undefined) {
  const cached = productId ? getCachedModifierConfig(productId) : null;
  const [config, setConfig] = useState<ProductModifierConfig | null>(cached);
  const [loading, setLoading] = useState(productId ? !cached : false);

  useEffect(() => {
    if (!productId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    // Hit cache imediato — sem spinner
    const fromCache = getCachedModifierConfig(productId);
    if (fromCache) {
      setConfig(fromCache);
      setLoading(false);
      return;
    }


    let active = true;
    (async () => {
      setLoading(true);
      try {
        let product: {
          id: string;
          product_type?: string;
          combo_unit_count?: number;
          unit_label?: unknown;
        } | null = null;

        const full = await supabase
          .from("products")
          .select("id, product_type, combo_unit_count, unit_label")
          .eq("id", productId)
          .maybeSingle();

        if (full.error) {
          const minimal = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
          if (minimal.error || !minimal.data) {
            if (active) setConfig(emptyConfig(productId));
            return;
          }
          product = minimal.data;
        } else {
          product = full.data;
        }

        if (!product) {
          if (active) setConfig(emptyConfig(productId));
          return;
        }

        const linksRes = await supabase
          .from("product_modifier_groups")
          .select("sort_order, repeat_per_unit, group_id")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true });

        if (linksRes.error || !linksRes.data?.length) {
          if (active) {
            setConfig({
              productId,
              productType: (product.product_type as ProductType) || "simple",
              comboUnitCount: product.combo_unit_count || 0,
              unitLabel: asName(product.unit_label),
              groups: [],
              hasStructuredModifiers: false,
            });
          }
          return;
        }

        const links = linksRes.data;
        const groupIds = links.map((l) => l.group_id);
        const groupsRes = await supabase
          .from("modifier_groups")
          .select("*")
          .in("id", groupIds)
          .eq("is_active", true);

        if (groupsRes.error || !groupsRes.data?.length) {
          if (active) setConfig(emptyConfig(productId));
          return;
        }

        const optionsRes = await supabase
          .from("modifier_options")
          .select("*")
          .in("group_id", groupIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (optionsRes.error) {
          if (active) setConfig(emptyConfig(productId));
          return;
        }

        const optionsByGroup = new Map<string, ModifierOption[]>();
        for (const opt of optionsRes.data || []) {
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

        const groupMap = new Map<string, any>((groupsRes.data as any[]).map((g: any) => [g.id, g]));
        const groups: ModifierGroup[] = links
          .map((link: any) => {
            const g: any = groupMap.get(link.group_id);

            if (!g || !g.is_active) return null;
            return {
              id: g.id,
              storeId: g.store_id,
              name: asName(g.name),
              description: asName(g.description),
              groupKind: g.group_kind as ModifierGroup["groupKind"],
              selectionMode: g.selection_mode as ModifierGroup["selectionMode"],
              minSelect: g.min_select ?? 0,
              maxSelect: g.max_select ?? 1,
              isRequired: g.is_required ?? false,
              sortOrder: link.sort_order ?? g.sort_order ?? 0,
              repeatPerUnit: link.repeat_per_unit ?? false,
              linkSortOrder: link.sort_order ?? 0,
              options: optionsByGroup.get(g.id) || [],
            };
          })
          .filter(Boolean) as ModifierGroup[];

        const finalConfig: ProductModifierConfig = {
          productId,
          productType: (product.product_type as ProductType) || "simple",
          comboUnitCount: Math.max(0, product.combo_unit_count || 0),
          unitLabel: asName(product.unit_label),
          groups: sortModifierGroups(groups),
          hasStructuredModifiers: groups.length > 0,
        };
        setCachedModifierConfig(productId, finalConfig);
        if (active) {
          setConfig(finalConfig);
        }
      } catch (err) {
        console.warn("[useProductModifierConfig]", err);
        if (active) setConfig(emptyConfig(productId));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  return { config, loading };
}
