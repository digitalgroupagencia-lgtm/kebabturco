/** Histórico local de pedidos, separado da sessão admin (localStorage do dispositivo). */

const HISTORY_KEY = "kiosk-order-history";
const MAX_ENTRIES = 25;

export type LocalOrderHistoryEntry = {
  id: string;
  orderNumber: string;
  storeId: string;
  total: number;
  orderType: string;
  status: string;
  createdAt: string;
  itemCount: number;
};

export function loadLocalOrderHistory(storeId?: string): LocalOrderHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalOrderHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter((e) => e?.id && e?.orderNumber);
    if (storeId) return list.filter((e) => e.storeId === storeId);
    return list;
  } catch {
    return [];
  }
}

export function appendLocalOrderHistory(entry: LocalOrderHistoryEntry) {
  try {
    const existing = loadLocalOrderHistory();
    const next = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function updateLocalOrderHistoryStatus(orderId: string, status: string) {
  try {
    const list = loadLocalOrderHistory();
    const idx = list.findIndex((e) => e.id === orderId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], status };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
