import { supabase } from "@/integrations/supabase/client";

export type CloneStoreMenuResult = {
  success: boolean;
  categories_copied: number;
  products_copied: number;
};

export async function cloneStoreMenu(
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
