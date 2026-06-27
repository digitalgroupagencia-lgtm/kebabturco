import type { Screen } from "@/contexts/OrderContext";
import type { CartItem } from "@/customer/contexts/CartContext";

export const SELLER_CART_KEY = "seller-cart-v1";
export const SELLER_SESSION_KEY = "seller-session-v1";

const SELLER_SCREENS = new Set<Screen>(["home", "product", "review", "payment"]);

export type SellerCheckoutDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  tableNumber: string;
  type: "dine_in" | "takeaway";
  notes: string;
  savedOrder: {
    id: string;
    order_number: string;
    total: number;
    customer_email?: string | null;
  } | null;
};

export type SellerSession = {
  screen: Screen;
  selectedProductId: string | null;
  selectedCategory: string | null;
  storeId: string;
  checkout: SellerCheckoutDraft;
  updatedAt: number;
};

const EMPTY_CHECKOUT: SellerCheckoutDraft = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  tableNumber: "",
  type: "dine_in",
  notes: "",
  savedOrder: null,
};

export function isSellerNewOrderPath(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.replace(/\/+$/, "").endsWith("/seller/new");
}

export function loadSellerCart(): CartItem[] {
  if (!isSellerNewOrderPath()) return [];
  try {
    const saved = localStorage.getItem(SELLER_CART_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSellerCart(items: CartItem[]) {
  if (!isSellerNewOrderPath()) return;
  try {
    if (items.length === 0) localStorage.removeItem(SELLER_CART_KEY);
    else localStorage.setItem(SELLER_CART_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function clearSellerCart() {
  try {
    localStorage.removeItem(SELLER_CART_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSellerSession(): SellerSession | null {
  if (!isSellerNewOrderPath()) return null;
  try {
    const raw = localStorage.getItem(SELLER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SellerSession;
    if (!parsed || typeof parsed !== "object") return null;
    if (!SELLER_SCREENS.has(parsed.screen)) return null;
    return {
      ...parsed,
      selectedProductId: parsed.selectedProductId ?? null,
      selectedCategory: parsed.selectedCategory ?? null,
      checkout: { ...EMPTY_CHECKOUT, ...(parsed.checkout ?? {}) },
    };
  } catch {
    return null;
  }
}

export function saveSellerSession(patch: Partial<SellerSession> & { storeId?: string }) {
  if (!isSellerNewOrderPath()) return;
  try {
    const prev = loadSellerSession();
    const next: SellerSession = {
      screen: patch.screen ?? prev?.screen ?? "home",
      selectedProductId: patch.selectedProductId !== undefined ? patch.selectedProductId : (prev?.selectedProductId ?? null),
      selectedCategory: patch.selectedCategory !== undefined ? patch.selectedCategory : (prev?.selectedCategory ?? null),
      storeId: patch.storeId ?? prev?.storeId ?? "",
      checkout: { ...EMPTY_CHECKOUT, ...(prev?.checkout ?? {}), ...(patch.checkout ?? {}) },
      updatedAt: Date.now(),
    };
    localStorage.setItem(SELLER_SESSION_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function saveSellerCheckoutDraft(checkout: Partial<SellerCheckoutDraft>) {
  const prev = loadSellerSession();
  saveSellerSession({
    checkout: { ...EMPTY_CHECKOUT, ...(prev?.checkout ?? {}), ...checkout },
  });
}

export function clearSellerSession() {
  try {
    localStorage.removeItem(SELLER_SESSION_KEY);
    localStorage.removeItem(SELLER_CART_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveSellerInitialScreen(storeId: string): Screen {
  const session = loadSellerSession();
  const cartCount = loadSellerCart().length;
  const checkout = session?.checkout;
  const hasCheckout =
    Boolean(checkout?.savedOrder) ||
    Boolean(checkout?.customerName?.trim()) ||
    Boolean(checkout?.tableNumber?.trim()) ||
    Boolean(checkout?.notes?.trim());
  const hasWork = cartCount > 0 || hasCheckout;

  if (session && session.storeId && session.storeId !== storeId) {
    clearSellerSession();
    return "home";
  }

  if (!hasWork) return "home";
  if (session?.screen && SELLER_SCREENS.has(session.screen)) return session.screen;
  if (checkout?.savedOrder || checkout?.customerName?.trim()) return "payment";
  if (cartCount > 0) return "review";
  return "home";
}

export function resolveSellerInitialProductId(): string | null {
  return loadSellerSession()?.selectedProductId ?? null;
}

export function resolveSellerInitialCategory(): string | null {
  return loadSellerSession()?.selectedCategory ?? null;
}
