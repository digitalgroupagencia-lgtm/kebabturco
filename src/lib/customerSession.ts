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

export function readLangFromUrl(): SavedLang | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("lang")?.trim().toLowerCase();
    return raw && VALID_LANGS.has(raw) ? (raw as SavedLang) : null;
  } catch {
    return null;
  }
}

export function hasMesaQrInUrl(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("t")?.trim());
  } catch {
    return false;
  }
}

/** Salta idioma com pedido activo, carrinho ou QR de mesa válido na URL. */
export function shouldSkipLanguageScreen(): boolean {
  if (loadAnyStoredActiveOrder()?.orderId) return true;
  if (loadCartItemCount() > 0) return true;
  if (hasMesaQrInUrl()) return true;
  if (loadSavedMesaToken()) return true;
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
  if (hasMesaQrInUrl() || loadSavedMesaToken()) return "orderType";
  return "language";
}

export const KIOSK_TABLE_KEY = "kiosk-table-number";
export const KIOSK_MESA_TOKEN_KEY = "kiosk-mesa-token";

export function loadSavedMesaToken(): string | null {
  try {
    const raw = localStorage.getItem(KIOSK_MESA_TOKEN_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function saveSavedMesaToken(token: string) {
  try {
    localStorage.setItem(KIOSK_MESA_TOKEN_KEY, token.trim());
  } catch {
    /* ignore */
  }
}

export function clearSavedMesaToken() {
  try {
    localStorage.removeItem(KIOSK_MESA_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
export const KIOSK_PHONE_DIAL_KEY = "kiosk-phone-dial";
export const KIOSK_PHONE_LOCAL_KEY = "kiosk-phone-local";

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

export function loadSavedCustomerPhone(): { dialCode: string; local: string } | null {
  try {
    const dial = localStorage.getItem(KIOSK_PHONE_DIAL_KEY);
    const local = localStorage.getItem(KIOSK_PHONE_LOCAL_KEY);
    if (!local?.trim()) return null;
    return { dialCode: dial || "+34", local: local.trim() };
  } catch {
    return null;
  }
}

export function saveSavedCustomerPhone(dialCode: string, local: string) {
  try {
    const trimmed = local.trim();
    if (trimmed) {
      localStorage.setItem(KIOSK_PHONE_DIAL_KEY, dialCode);
      localStorage.setItem(KIOSK_PHONE_LOCAL_KEY, trimmed);
    } else {
      localStorage.removeItem(KIOSK_PHONE_DIAL_KEY);
      localStorage.removeItem(KIOSK_PHONE_LOCAL_KEY);
    }
  } catch {
    /* ignore */
  }
}

export const KIOSK_CUSTOMER_NAME_KEY = "kiosk-customer-name";
export const KIOSK_DELIVERY_KEY = "kiosk-delivery-address";

export type SavedDeliveryAddress = {
  street: string;
  number: string;
  complement: string;
  postalCode: string;
  city: string;
  notes: string;
};

export function loadSavedCustomerName(): string {
  try {
    return localStorage.getItem(KIOSK_CUSTOMER_NAME_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function saveSavedCustomerName(name: string) {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(KIOSK_CUSTOMER_NAME_KEY, trimmed);
    else localStorage.removeItem(KIOSK_CUSTOMER_NAME_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSavedDeliveryAddress(): SavedDeliveryAddress | null {
  try {
    const raw = localStorage.getItem(KIOSK_DELIVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDeliveryAddress;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      street: parsed.street || "",
      number: parsed.number || "",
      complement: parsed.complement || "",
      postalCode: parsed.postalCode || "",
      city: parsed.city || "",
      notes: parsed.notes || "",
    };
  } catch {
    return null;
  }
}

export function saveSavedDeliveryAddress(addr: SavedDeliveryAddress) {
  try {
    const hasData = Object.values(addr).some((v) => String(v).trim());
    if (hasData) localStorage.setItem(KIOSK_DELIVERY_KEY, JSON.stringify(addr));
    else localStorage.removeItem(KIOSK_DELIVERY_KEY);
  } catch {
    /* ignore */
  }
}
