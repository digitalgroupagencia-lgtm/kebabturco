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
export const KIOSK_MESA_SESSION_KEY = "kiosk-mesa-session-id";

export function loadSavedMesaSessionId(): string | null {
  try {
    const raw = localStorage.getItem(KIOSK_MESA_SESSION_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function saveSavedMesaSessionId(sessionId: string) {
  try {
    localStorage.setItem(KIOSK_MESA_SESSION_KEY, sessionId.trim());
  } catch {
    /* ignore */
  }
}

export function clearSavedMesaSessionId() {
  try {
    localStorage.removeItem(KIOSK_MESA_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function clearMesaBindingStorage() {
  clearSavedMesaToken();
  clearSavedMesaSessionId();
  try {
    localStorage.removeItem(KIOSK_TABLE_KEY);
  } catch {
    /* ignore */
  }
}

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
  floor: string;
  door: string;
  block: string;
  postalCode: string;
  city: string;
  notes: string;
};

export type DeliveryComplementLabels = {
  floor: string;
  door: string;
  block: string;
};

/** Combines optional floor/door/block for orders and legacy `delivery_complement` column. */
export function formatDeliveryComplement(
  floor: string,
  door: string,
  block: string,
  labels: DeliveryComplementLabels,
): string {
  const parts: string[] = [];
  const f = floor.trim();
  const d = door.trim();
  const b = block.trim();
  if (f) parts.push(`${labels.floor} ${f}`);
  if (d) parts.push(`${labels.door} ${d}`);
  if (b) parts.push(`${labels.block} ${b}`);
  return parts.join(", ");
}

function normalizeSavedDelivery(parsed: Record<string, unknown>): SavedDeliveryAddress {
  const floor = String(parsed.floor ?? "").trim();
  const door = String(parsed.door ?? "").trim();
  const block = String(parsed.block ?? "").trim();
  const legacyComplement = String(parsed.complement ?? "").trim();
  if (!floor && !door && legacyComplement) {
    const split = legacyComplement.match(/^(\d+\s*º?\s*)\s*(.+)$/i);
    if (split) {
      return {
        street: String(parsed.street ?? ""),
        number: String(parsed.number ?? ""),
        floor: split[1].trim(),
        door: split[2].trim(),
        block: "",
        postalCode: String(parsed.postalCode ?? ""),
        city: String(parsed.city ?? ""),
        notes: String(parsed.notes ?? ""),
      };
    }
    return {
      street: String(parsed.street ?? ""),
      number: String(parsed.number ?? ""),
      floor: "",
      door: legacyComplement,
      block: "",
      postalCode: String(parsed.postalCode ?? ""),
      city: String(parsed.city ?? ""),
      notes: String(parsed.notes ?? ""),
    };
  }
  return {
    street: String(parsed.street ?? ""),
    number: String(parsed.number ?? ""),
    floor,
    door,
    block,
    postalCode: String(parsed.postalCode ?? ""),
    city: String(parsed.city ?? ""),
    notes: String(parsed.notes ?? ""),
  };
}

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
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeSavedDelivery(parsed);
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

const EMPTY_DELIVERY: SavedDeliveryAddress = {
  street: "",
  number: "",
  floor: "",
  door: "",
  block: "",
  postalCode: "",
  city: "",
  notes: "",
};

export type CustomerProfile = {
  name: string;
  phoneDialCode: string;
  phoneLocal: string;
  delivery: SavedDeliveryAddress;
};

export function loadCustomerProfile(): CustomerProfile {
  const phone = loadSavedCustomerPhone();
  const delivery = loadSavedDeliveryAddress();
  return {
    name: loadSavedCustomerName(),
    phoneDialCode: phone?.dialCode ?? "+34",
    phoneLocal: phone?.local ?? "",
    delivery: delivery ?? { ...EMPTY_DELIVERY },
  };
}

export function saveCustomerProfile(profile: CustomerProfile) {
  saveSavedCustomerName(profile.name);
  saveSavedCustomerPhone(profile.phoneDialCode, profile.phoneLocal);
  saveSavedDeliveryAddress(profile.delivery);
}

export function hasCustomerProfile(): boolean {
  const profile = loadCustomerProfile();
  return Boolean(
    profile.name.trim() ||
      profile.phoneLocal.trim() ||
      profile.delivery.street.trim() ||
      profile.delivery.city.trim(),
  );
}

export function applyCustomerProfileToOrderContext(
  profile: CustomerProfile,
  setters: {
    setCustomerName: (v: string) => void;
    setPhoneDialCode: (v: string) => void;
    setCustomerPhone: (v: string) => void;
    setDeliveryAddress: (v: string) => void;
    setDeliveryNumber: (v: string) => void;
    setDeliveryFloor: (v: string) => void;
    setDeliveryDoor: (v: string) => void;
    setDeliveryBlock: (v: string) => void;
    setDeliveryPostalCode: (v: string) => void;
    setDeliveryCity: (v: string) => void;
    setDeliveryNotes: (v: string) => void;
  },
) {
  if (profile.name.trim()) setters.setCustomerName(profile.name.trim());
  if (profile.phoneLocal.trim()) {
    setters.setPhoneDialCode(profile.phoneDialCode);
    setters.setCustomerPhone(profile.phoneLocal.trim());
  }
  const d = profile.delivery;
  if (d.street.trim()) setters.setDeliveryAddress(d.street.trim());
  if (d.number.trim()) setters.setDeliveryNumber(d.number.trim());
  if (d.floor.trim()) setters.setDeliveryFloor(d.floor.trim());
  if (d.door.trim()) setters.setDeliveryDoor(d.door.trim());
  if (d.block.trim()) setters.setDeliveryBlock(d.block.trim());
  if (d.postalCode.trim()) setters.setDeliveryPostalCode(d.postalCode.trim());
  if (d.city.trim()) setters.setDeliveryCity(d.city.trim());
  if (d.notes.trim()) setters.setDeliveryNotes(d.notes.trim());
}
