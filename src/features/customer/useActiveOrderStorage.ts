export const ACTIVE_ORDER_STORAGE_KEY = "kiosk-active-order";

export interface StoredActiveOrder {
  orderId: string;
  orderNumber: string;
  storeId: string;
}

export function loadStoredActiveOrder(storeId: string): StoredActiveOrder | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveOrder;
    if (parsed.storeId === storeId && parsed.orderId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStoredActiveOrder(data: StoredActiveOrder) {
  localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredActiveOrder() {
  localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
}
