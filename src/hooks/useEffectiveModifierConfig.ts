import { useMemo } from "react";
import type { MenuProduct } from "@/hooks/useMenuData";
import { useProductModifierConfig } from "@/hooks/useProductModifierConfig";
import type { ProductModifierConfig } from "@/lib/modifiers/types";
import { safeSynthesizeModifierConfig } from "@/lib/modifiers/safeCustomization";
import { sanitizeProductModifierConfig } from "@/lib/modifiers/sanitizeGroups";
import { adaptConfigForDrinkProduct, isDrinkProduct } from "@/lib/modifiers/drinkProduct";
import { adaptConfigForSandwichSpicy } from "@/lib/modifiers/sandwichSpicy";
import { applyComboDescriptionRules, applySimpleProductRules } from "@/lib/modifiers/comboConfigFilter";
import { filterProductModifierConfig } from "@/lib/modifiers/proteinRules";
import { resolveIsComboProduct } from "@/lib/modifiers/productClassification";

/** Configuração efectiva: apenas grupos ligados ao product_id na BD, ou dados próprios do produto (sem globais). */
export function useEffectiveModifierConfig(
  product: MenuProduct | undefined,
  allProducts: MenuProduct[] = [],
) {
  const { config: dbConfig, loading: dbLoading } = useProductModifierConfig(product?.id);

  const config = useMemo((): ProductModifierConfig | null => {
    const finalize = (cfg: ProductModifierConfig | null) => {
      if (!cfg || !product) return cfg;
      const filtered = filterProductModifierConfig(product, cfg);
      const rulesApplied = resolveIsComboProduct(product)
        ? applyComboDescriptionRules(product, filtered, allProducts)
        : applySimpleProductRules(product, filtered, allProducts);
      return rulesApplied ? sanitizeProductModifierConfig(rulesApplied) : null;
    };

    try {
      if (!product) return finalize(dbConfig);

      if (dbConfig?.hasStructuredModifiers) {
        return finalize(dbConfig);
      }

      const synthesized = safeSynthesizeModifierConfig(product, allProducts);
      return finalize(synthesized);
    } catch (err) {
      console.error("[useEffectiveModifierConfig]", err);
      return finalize(dbConfig);
    }
  }, [product, dbConfig, allProducts]);

  const drinkAdapted = useMemo(
    () => (product ? adaptConfigForDrinkProduct(product, config) : config),
    [product, config],
  );

  const finalConfig = useMemo(
    () => adaptConfigForSandwichSpicy(product, drinkAdapted),
    [product, drinkAdapted],
  );

  return {
    config: finalConfig,
    loading: dbLoading,
    hasStructuredModifiers: Boolean(finalConfig?.hasStructuredModifiers),
    isDrink: isDrinkProduct(product),
  };
}
