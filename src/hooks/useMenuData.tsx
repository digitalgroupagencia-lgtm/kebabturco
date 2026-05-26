import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { inferChoiceVariantsFromDescription, inferVariantsFromText } from "@/lib/parseProductCustomization";
import { safeHasFixedProtein } from "@/lib/modifiers/safeCustomization";
import { normalizeProductClassification } from "@/lib/modifiers/productClassification";
import type { Category, Extra, Product, Variant } from "@/data/products";

type JsonName = Record<string, string>;

export type MenuProduct = Product & {
  ingredients?: string[];
  productType?: "simple" | "combo";
  comboUnitCount?: number;
  unitLabel?: Record<string, string>;
  categorySlug?: string;
};

export type MenuLoadError = "network" | "empty" | "no_store";

const asName = (value: unknown, fallback = ""): JsonName => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonName;
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

export function useMenuData() {
  const { storeId, selectedStoreId, loading: storeLoading } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MenuLoadError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let active = true;

    if (!effectiveStoreId) {
      if (storeLoading) {
        setLoading(true);
        setError(null);
        return;
      }
      setCategories([]);
      setProducts([]);
      setError("no_store");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);

      const [catRes, prodRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, image_url, sort_order, created_at")
          .eq("store_id", effectiveStoreId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("products")
          .select("id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order, created_at, price_modifiers, product_type, combo_unit_count, unit_label")
          .eq("store_id", effectiveStoreId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      let productRows = prodRes.data;
      if (prodRes.error) {
        const fallback = await supabase
          .from("products")
          .select("id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order, created_at, price_modifiers")
          .eq("store_id", effectiveStoreId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (fallback.error) {
          console.error("[useMenuData]", fallback.error);
          setCategories([]);
          setProducts([]);
          setError("network");
          setLoading(false);
          return;
        }
        productRows = fallback.data;
      }

      if (!active) return;

      if (catRes.error) {
        console.error("[useMenuData]", catRes.error);
        setCategories([]);
        setProducts([]);
        setError("network");
        setLoading(false);
        return;
      }

      const catRows = catRes.data;

      if (!catRows?.length || !productRows?.length) {
        setCategories([]);
        setProducts([]);
        setError("empty");
        setLoading(false);
        return;
      }

      const mappedCategories = catRows.map((cat: { id: string; name: unknown; image_url: string | null }) => ({
        id: cat.id,
        name: asName(cat.name),
        image: cat.image_url || "",
        icon: "",
      }));

      const categorySlug = new Map(
        catRows.map((cat: { id: string; name: unknown }) => {
          const n = asName(cat.name);
          const slug = (n.es || n.pt || n.en || "cat").toLowerCase().replace(/\s+/g, "-");
          return [cat.id, slug];
        }),
      );

      const categoryImage = new Map(mappedCategories.map((cat) => [cat.id, cat.image]));
      let mappedProducts: MenuProduct[];
      try {
        mappedProducts = productRows.map((prod: Record<string, unknown>) => {
          const modifiers = Array.isArray(prod.price_modifiers) ? prod.price_modifiers : [];
          const allExtras = modifiers.map((modifier: Record<string, unknown>, index: number) => ({
            id: (modifier.id as string) || `modifier-${index}`,
            name: asName(modifier.name),
            price: Number(modifier.price || 0),
          })) as Extra[];
          const ingredients = allExtras.filter(isRemovalModifier).map(ingredientFromModifier).filter(Boolean);
          const extras = allExtras.filter((extra) => !isRemovalModifier(extra));

          const name = asName(prod.name);
          const description = asName(prod.description);
          const descText = description.es || description.pt || description.en || "";
          const nameText = name.es || name.pt || name.en || "";
          const inferredMeat = inferVariantsFromText(descText) || inferVariantsFromText(nameText);
          const inferredChoice =
            inferredMeat.length >= 2
              ? []
              : inferChoiceVariantsFromDescription(descText) ||
                inferChoiceVariantsFromDescription(nameText);
          const inferredVariants = inferredMeat.length >= 2 ? inferredMeat : inferredChoice;
          const draftProduct = {
            id: prod.id as string,
            name,
            description,
            price: Number(prod.price || 0),
            image: (prod.image_url as string) || (categoryImage.get(prod.category_id as string) as string) || "",
            category: prod.category_id as string,
            categorySlug: (categorySlug.get(prod.category_id as string) as string) || "",
            isBestseller: Boolean(prod.is_bestseller),
            isPromo: Boolean(prod.is_promo),
            extras,
            ingredients,
            variants: inferredVariants.length >= 2 ? inferredVariants : undefined,
            productType: (prod.product_type as "simple" | "combo") || undefined,
            comboUnitCount: Number(prod.combo_unit_count || 0) || undefined,
            unitLabel: asName(prod.unit_label),
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
      } catch (err) {
        console.error("[useMenuData] product mapping failed", err);
        if (!active) return;
        setCategories([]);
        setProducts([]);
        setError("network");
        setLoading(false);
        return;
      }

      setCategories(mappedCategories);
      setProducts(mappedProducts);
      setError(null);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [effectiveStoreId, reloadToken, storeLoading]);

  return useMemo(
    () => ({ categories, products, loading, error, retry }),
    [categories, products, loading, error, retry],
  );
}
