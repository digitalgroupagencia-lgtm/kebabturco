import { supabase } from "@/integrations/supabase/client";

const keyForStore = (storeId: string) => `menu-catalog-approved:${storeId}`;

export function readApprovedProductIds(storeId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(keyForStore(storeId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeApprovedProductIds(storeId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyForStore(storeId), JSON.stringify([...ids]));
}

export function approveProductReview(storeId: string, productId: string): Set<string> {
  const next = readApprovedProductIds(storeId);
  next.add(productId);
  writeApprovedProductIds(storeId, next);
  return next;
}

export async function persistProductReviewApproval(
  storeId: string,
  productId: string,
): Promise<Set<string>> {
  const next = approveProductReview(storeId, productId);
  const { error } = await supabase
    .from("products")
    .update({ catalog_review_ok: true })
    .eq("id", productId)
    .eq("store_id", storeId);
  if (error) throw error;
  return next;
}

/** Sincroniza aprovações antigas do browser para a base de dados. */
export async function syncLocalReviewApprovalsToDb(
  storeId: string,
  localIds: Iterable<string>,
): Promise<void> {
  const ids = [...localIds];
  if (!ids.length) return;
  await supabase
    .from("products")
    .update({ catalog_review_ok: true })
    .eq("store_id", storeId)
    .in("id", ids)
    .eq("catalog_review_ok", false);
}

export function clearProductReviewApproval(storeId: string, productId: string): Set<string> {
  const next = readApprovedProductIds(storeId);
  next.delete(productId);
  writeApprovedProductIds(storeId, next);
  return next;
}

export function approvedIdsFromProducts(
  products: { id: string; catalogReviewOk?: boolean }[],
  storeId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const product of products) {
    if (product.catalogReviewOk) ids.add(product.id);
  }
  for (const id of readApprovedProductIds(storeId)) ids.add(id);
  return ids;
}
