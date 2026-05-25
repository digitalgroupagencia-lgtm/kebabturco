import { loadAnyStoredActiveOrder } from "@/features/customer/useActiveOrderStorage";
import type { Screen } from "@/contexts/OrderContext";

export const KIOSK_LANG_KEY = "kiosk-lang";
export const KIOSK_ORDER_TYPE_KEY = "kiosk-order-type";
const CART_KEY = "kiosk-cart";
const VALID_LANGS = new Set(["pt", "en", "es", "fr"]);

export type SavedLang = "pt" | "en" | "es" | "fr";
export type SavedOrderType = "here" | "takeaway" | "delivery";

export function loadSavedLang(): SavedLang | null {
  try {
    const raw = localStorage.getItem(KIOSK_LANG_KEY);
    return raw && VALID_LANGS.has(raw) ? (raw as SavedLang) : null;
  } catch {
    return null;
  }
}

export function saveSavedLang(lang: SavedLang) {
  try {
    localStorage.setItem(KIOSK_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function loadSavedOrderType(): SavedOrderType | null {
  try {
    const raw = localStorage.getItem(KIOSK_ORDER_TYPE_KEY);
    if (raw === "here" || raw === "takeaway" || raw === "delivery") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveSavedOrderType(type: SavedOrderType | null) {
  try {
    if (type) localStorage.setItem(KIOSK_ORDER_TYPE_KEY, type);
    else localStorage.removeItem(KIOSK_ORDER_TYPE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadCartItemCount(): number {
  try {
    const saved = localStorage.getItem(CART_KEY);
    if (!saved) return 0;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** Salta idioma se o cliente já escolheu antes ou tem pedido/carrinho em curso. */
export function shouldSkipLanguageScreen(): boolean {
  if (loadAnyStoredActiveOrder()?.orderId) return true;
  if (loadCartItemCount() > 0) return true;
  if (loadSavedLang()) return true;
  return false;
}

/** Para onde ir quando se salta o ecrã de idioma. */
export function resolveScreenAfterLanguageSkip(): Screen {
  const storedOrder = loadAnyStoredActiveOrder();
  if (storedOrder?.orderId) {
    if (storedOrder.screen === "tracking") return "tracking";
    return "confirmation";
  }
  if (loadCartItemCount() > 0) return "home";
  if (loadSavedOrderType()) return "home";
  if (loadSavedLang()) return "orderType";
  return "language";
}

export const KIOSK_TABLE_KEY = "kiosk-table-number";

export function loadSavedTableNumber(): string {
  try {
    return localStorage.getItem(KIOSK_TABLE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSavedTableNumber(value: string) {
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(KIOSK_TABLE_KEY, trimmed);
    else localStorage.removeItem(KIOSK_TABLE_KEY);
  } catch {
    /* ignore */
  }
}
