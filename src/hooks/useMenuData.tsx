import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  categories as fallbackCategories,
  products as fallbackProducts,
  type Category,
  type Extra,
  type Product,
} from "@/data/products";

type JsonName = Record<string, string>;

export type MenuProduct = Product & { ingredients?: string[] };

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
  const { storeId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!effectiveStoreId) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      const [{ data: catRows }, { data: productRows }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, image_url, sort_order, created_at")
          .eq("store_id", effectiveStoreId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("products")
          .select("id, category_id, name, description, price, image_url, is_bestseller, is_promo, sort_order, created_at, price_modifiers")
          .eq("store_id", effectiveStoreId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (!active) return;

      if (!catRows?.length || !productRows?.length) {
        setCategories(fallbackCategories);
        setProducts(fallbackProducts);
        setLoading(false);
        return;
      }

      const mappedCategories = catRows.map((cat: any) => ({
        id: cat.id,
        name: asName(cat.name),
        image: cat.image_url || "",
        icon: "",
      }));

      const categoryImage = new Map(mappedCategories.map((cat) => [cat.id, cat.image]));
      const mappedProducts = productRows.map((prod: any) => {
        const modifiers = Array.isArray(prod.price_modifiers) ? prod.price_modifiers : [];
        const allExtras = modifiers.map((modifier: any, index: number) => ({
          id: modifier.id || `modifier-${index}`,
          name: asName(modifier.name),
          price: Number(modifier.price || 0),
        })) as Extra[];
        const ingredients = allExtras.filter(isRemovalModifier).map(ingredientFromModifier).filter(Boolean);
        const extras = allExtras.filter((extra) => !isRemovalModifier(extra));

        return {
          id: prod.id,
          name: asName(prod.name),
          description: asName(prod.description),
          price: Number(prod.price || 0),
          image: prod.image_url || categoryImage.get(prod.category_id) || "",
          category: prod.category_id,
          isBestseller: Boolean(prod.is_bestseller),
          isPromo: Boolean(prod.is_promo),
          extras,
          ingredients,
        } satisfies MenuProduct;
      });

      setCategories(mappedCategories);
      setProducts(mappedProducts);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [effectiveStoreId]);

  return useMemo(() => ({ categories, products, loading }), [categories, products, loading]);
}