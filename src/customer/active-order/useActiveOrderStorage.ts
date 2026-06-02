export const ACTIVE_ORDER_STORAGE_KEY = "kiosk-active-order";

export interface StoredActiveOrder {
  orderId: string;
  orderNumber: string;
  storeId: string;
  screen?: "confirmation" | "tracking";
}

export function loadAnyStoredActiveOrder(): StoredActiveOrder | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveOrder;
    if (parsed.orderId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function loadStoredActiveOrder(storeId: string): StoredActiveOrder | null {
  const parsed = loadAnyStoredActiveOrder();
  if (!parsed) return null;
  if (storeId && parsed.storeId !== storeId) return null;
  return parsed;
}

export function saveStoredActiveOrder(data: StoredActiveOrder) {
  try {
    localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredActiveOrder() {
  try {
    localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
