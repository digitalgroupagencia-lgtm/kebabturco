import React, { createContext, useContext, useState, useEffect } from "react";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import { loadSavedOrderType, saveSavedOrderType } from "@/lib/customerSession";
import { isSellerNewOrderPath, SELLER_CART_KEY, clearSellerCart } from "@/lib/sellerSession";
import type { CartConfiguration, ModifierSelection, ProductType } from "@/lib/modifiers/types";

export interface CartItemExtra {
  id: string;
  name: Record<string, string>;
  price: number;
  quantity: number;
}

export interface CartItemIngredient {
  name: string;
  included: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: Record<string, string>;
  productImage: string | null;
  basePrice: number;
  quantity: number;
  sizeName: Record<string, string> | null;
  sizeAdd: number;
  extras: CartItemExtra[];
  removedIngredients: string[];
  note?: string;
  unitPrice: number;
  totalPrice: number;
  /** Seleções estruturadas (sistema de modificadores) */
  selections?: ModifierSelection[];
  configuration?: CartConfiguration;
  productType?: ProductType;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  updateItem: (id: string, item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  orderType: "here" | "takeaway" | "delivery" | null;
  setOrderType: (t: "here" | "takeaway" | "delivery") => void;
  clearOrderType: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const shouldKeepGrouped = (item: Omit<CartItem, "id">) =>
  item.productType === "combo" ||
  Boolean(item.configuration?.comboUnits?.length) ||
  (item.selections?.length ?? 0) > 0;

function createCartItemId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fallback abaixo */
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const splitIntoSingleItems = (item: Omit<CartItem, "id">, firstId?: string): CartItem[] => {
  const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
  const unitPrice = Number.isFinite(item.unitPrice)
    ? item.unitPrice
    : (Number(item.totalPrice) || 0) / quantity;

  if (shouldKeepGrouped(item)) {
    return [{
      ...item,
      id: firstId || createCartItemId(),
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
    }];
  }

  return Array.from({ length: quantity }, (_, index) => ({
    ...item,
    id: index === 0 && firstId ? firstId : createCartItemId(),
    quantity: 1,
    unitPrice,
    totalPrice: unitPrice,
  }));
};

const CUSTOMER_CART_KEY = "kiosk-cart";

function cartStorageKey() {
  return isSellerNewOrderPath() ? SELLER_CART_KEY : CUSTOMER_CART_KEY;
}

function loadCartFromStorage(): CartItem[] {
  try {
    const saved = localStorage.getItem(cartStorageKey());
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    const valid = Array.isArray(parsed) && parsed.every(
      (i) => i && typeof i.productName === "object" && i.productName !== null,
    );
    if (!valid) {
      localStorage.removeItem(cartStorageKey());
      return [];
    }
    return parsed.flatMap((item: CartItem) => splitIntoSingleItems(item, item.id));
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [orderType, setOrderTypeState] = useState<"here" | "takeaway" | "delivery" | null>(() => {
    if (shouldForceDeliveryOnly()) return "delivery";
    return loadSavedOrderType();
  });

  const setOrderType = (t: "here" | "takeaway" | "delivery") => {
    setOrderTypeState(t);
    saveSavedOrderType(t);
  };

  const clearOrderType = () => {
    setOrderTypeState(null);
    saveSavedOrderType(null);
  };

  useEffect(() => {
    const needsSplit = items.some((item) => item.quantity !== 1 || item.totalPrice !== item.unitPrice);
    if (needsSplit) {
      setItems(prev => prev.flatMap((item) => splitIntoSingleItems(item, item.id)));
      return;
    }

    localStorage.setItem(cartStorageKey(), JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    const rows = splitIntoSingleItems(item);
    if (!rows.length) return;
    setItems((prev) => [...prev, ...rows]);
  };

  const updateItem = (id: string, item: Omit<CartItem, "id">) => {
    setItems(prev => prev.flatMap(i => (i.id === id ? splitIntoSingleItems(item, id) : [i])));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return removeItem(id);
    setItems(prev => prev.flatMap(i => i.id === id ? splitIntoSingleItems({ ...i, quantity: qty }, id) : [i]));
  };

  const clearCart = () => {
    setItems([]);
    if (isSellerNewOrderPath()) clearSellerCart();
    else localStorage.removeItem(CUSTOMER_CART_KEY);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, orderType, setOrderType, clearOrderType }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
