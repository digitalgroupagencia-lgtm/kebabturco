import { supabase } from "@/integrations/supabase/client";
import { productNameForLocale, type MessageLocale } from "@/lib/marketing/campaignTemplateEngine";

export type MarketingProductOption = {
  id: string;
  label: string;
  priceLabel: string;
  categoryLabel: string;
  marketingFeatured: boolean;
};

function formatPrice(value: number, locale: MessageLocale): string {
  const code = locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : "es-ES";
  return new Intl.NumberFormat(code, { style: "currency", currency: "EUR" }).format(value);
}

/** Lista de produtos activos para campanhas (selector no painel). */
export async function fetchMarketingProductOptions(
  storeId: string,
  locale: MessageLocale = "es",
): Promise<MarketingProductOption[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, category_id, marketing_featured, sort_order")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !products?.length) return [];

  const categoryIds = [
    ...new Set(products.map((p) => p.category_id).filter((id): id is string => Boolean(id))),
  ];
  const categoryMap = new Map<string, string>();
  if (categoryIds.length) {
    const { data: categories } = await supabase.from("categories").select("id, name").in("id", categoryIds);
    for (const cat of categories ?? []) {
      categoryMap.set(cat.id as string, productNameForLocale(cat.name, locale));
    }
  }

  return products.map((p) => ({
    id: p.id as string,
    label: productNameForLocale(p.name, locale),
    priceLabel: formatPrice(Number(p.price) || 0, locale),
    categoryLabel: p.category_id ? categoryMap.get(p.category_id as string) ?? "" : "",
    marketingFeatured: Boolean(p.marketing_featured),
  }));
}

export function presetUsesFeaturedProduct(variables: string[]): boolean {
  return variables.includes("produto_destaque");
}
