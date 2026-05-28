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

export function approveProductReview(storeId: string, productId: string): Set<string> {
  const next = readApprovedProductIds(storeId);
  next.add(productId);
  localStorage.setItem(keyForStore(storeId), JSON.stringify([...next]));
  return next;
}

export function clearProductReviewApproval(storeId: string, productId: string): Set<string> {
  const next = readApprovedProductIds(storeId);
  next.delete(productId);
  localStorage.setItem(keyForStore(storeId), JSON.stringify([...next]));
  return next;
}
