import { supabase as _supabase } from "@/integrations/supabase/client";

const supabase = _supabase as unknown as typeof _supabase & {
  from: (table: string) => ReturnType<typeof _supabase.from>;
};

export type CloneStoreMenuResult = {
  success: boolean;
  categories_copied: number;
  products_copied: number;
};

type CategoryRow = {
  id: string;
  name: unknown;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: unknown;
  description: unknown;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_bestseller: boolean | null;
  is_promo: boolean | null;
  sort_order: number | null;
  price_modifiers: unknown;
  product_type?: string | null;
  combo_unit_count?: number | null;
  unit_label?: unknown;
  after_add_suggestions?: unknown;
};

/** Duplica cardápio entre unidades — funciona sem função SQL na base. */
async function cloneStoreMenuClientSide(
  sourceStoreId: string,
  targetStoreId: string,
  options?: { copyImages?: boolean; replaceExisting?: boolean },
): Promise<CloneStoreMenuResult> {
  const copyImages = options?.copyImages ?? true;
  const replaceExisting = options?.replaceExisting ?? false;

  if (sourceStoreId === targetStoreId) {
    throw new Error("Origem e destino devem ser unidades diferentes");
  }

  const { count: targetCatCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", targetStoreId);

  const { count: targetProdCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", targetStoreId);

  const hasExisting = (targetCatCount ?? 0) > 0 || (targetProdCount ?? 0) > 0;

  if (hasExisting && !replaceExisting) {
    throw new Error(
      "A unidade destino já tem cardápio. Confirme substituir para apagar e copiar de novo.",
    );
  }

  if (replaceExisting && hasExisting) {
    const { error: delProdErr } = await supabase
      .from("products")
      .delete()
      .eq("store_id", targetStoreId);
    if (delProdErr) throw new Error(delProdErr.message);

    const { error: delCatErr } = await supabase
      .from("categories")
      .delete()
      .eq("store_id", targetStoreId);
    if (delCatErr) throw new Error(delCatErr.message);
  }

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name, image_url, is_active, sort_order")
    .eq("store_id", sourceStoreId)
    .order("sort_order")
    .order("created_at");

  if (catErr) throw new Error(catErr.message);
  if (!categories?.length) {
    throw new Error("A unidade de origem não tem categorias para copiar.");
  }

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", sourceStoreId)
    .order("sort_order")
    .order("created_at");

  if (prodErr) throw new Error(prodErr.message);

  const categoryIdMap = new Map<string, string>();
  let categoriesCopied = 0;

  for (const cat of categories as CategoryRow[]) {
    const { data: inserted, error } = await supabase
      .from("categories")
      .insert({
        store_id: targetStoreId,
        name: cat.name,
        image_url: copyImages ? cat.image_url : null,
        is_active: cat.is_active,
        sort_order: cat.sort_order ?? 0,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    categoryIdMap.set(cat.id, (inserted as { id: string }).id);
    categoriesCopied += 1;
  }

  let productsCopied = 0;
  const productsByCategory = (products ?? []) as ProductRow[];

  for (const prod of productsByCategory) {
    const newCategoryId = categoryIdMap.get(prod.category_id);
    if (!newCategoryId) continue;

    const payload: Record<string, unknown> = {
      store_id: targetStoreId,
      category_id: newCategoryId,
      name: prod.name,
      description: prod.description ?? {},
      price: prod.price,
      image_url: copyImages ? prod.image_url : null,
      is_active: prod.is_active,
      is_bestseller: prod.is_bestseller ?? false,
      is_promo: prod.is_promo ?? false,
      sort_order: prod.sort_order ?? 0,
      price_modifiers: prod.price_modifiers ?? [],
    };

    if (prod.product_type != null) payload.product_type = prod.product_type;
    if (prod.combo_unit_count != null) payload.combo_unit_count = prod.combo_unit_count;
    if (prod.unit_label != null) payload.unit_label = prod.unit_label;
    if (prod.after_add_suggestions != null) payload.after_add_suggestions = prod.after_add_suggestions;

    const { error } = await supabase.from("products").insert(payload as never);
    if (error) throw new Error(error.message);
    productsCopied += 1;
  }

  return {
    success: true,
    categories_copied: categoriesCopied,
    products_copied: productsCopied,
  };
}

async function cloneStoreMenuRpc(
  sourceStoreId: string,
  targetStoreId: string,
  options?: { copyImages?: boolean; replaceExisting?: boolean },
): Promise<CloneStoreMenuResult> {
  const db = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: CloneStoreMenuResult | null; error: { message: string } | null }>;
  };

  const { data, error } = await db.rpc("duplicate_store_menu", {
    _source_store_id: sourceStoreId,
    _target_store_id: targetStoreId,
    _copy_images: options?.copyImages ?? true,
    _replace_existing: options?.replaceExisting ?? false,
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error("Não foi possível duplicar o cardápio");

  return data;
}

export async function cloneStoreMenu(
  sourceStoreId: string,
  targetStoreId: string,
  options?: { copyImages?: boolean; replaceExisting?: boolean },
): Promise<CloneStoreMenuResult> {
  try {
    return await cloneStoreMenuRpc(sourceStoreId, targetStoreId, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const rpcMissing =
      /duplicate_store_menu/i.test(message) &&
      (/schema cache/i.test(message) || /could not find/i.test(message) || /42883/i.test(message));

    if (!rpcMissing) throw err;
    return cloneStoreMenuClientSide(sourceStoreId, targetStoreId, options);
  }
}
