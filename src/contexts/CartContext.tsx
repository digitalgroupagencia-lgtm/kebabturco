import React, { createContext, useContext, useState, useEffect } from "react";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import { loadSavedOrderType, saveSavedOrderType } from "@/lib/customerSession";

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const splitIntoSingleItems = (item: Omit<CartItem, "id">, firstId?: string): CartItem[] => {
  const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
  const unitPrice = Number.isFinite(item.unitPrice)
    ? item.unitPrice
    : (Number(item.totalPrice) || 0) / quantity;

  return Array.from({ length: quantity }, (_, index) => ({
    ...item,
    id: index === 0 && firstId ? firstId : crypto.randomUUID(),
    quantity: 1,
    unitPrice,
    totalPrice: unitPrice,
  }));
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("kiosk-cart");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Validate schema: productName must be an object (not a string from old version)
      const valid = Array.isArray(parsed) && parsed.every(
        (i) => i && typeof i.productName === "object" && i.productName !== null
      );
      if (!valid) {
        localStorage.removeItem("kiosk-cart");
        return [];
      }
      return parsed.flatMap((item: CartItem) => splitIntoSingleItems(item, item.id));
    } catch { return []; }
  });
  const [orderType, setOrderTypeState] = useState<"here" | "takeaway" | "delivery" | null>(() => {
    if (shouldForceDeliveryOnly()) return "delivery";
    return loadSavedOrderType();
  });

  const setOrderType = (t: "here" | "takeaway" | "delivery") => {
    setOrderTypeState(t);
    saveSavedOrderType(t);
  };

  useEffect(() => {
    const needsSplit = items.some((item) => item.quantity !== 1 || item.totalPrice !== item.unitPrice);
    if (needsSplit) {
      setItems(prev => prev.flatMap((item) => splitIntoSingleItems(item, item.id)));
      return;
    }

    localStorage.setItem("kiosk-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems(prev => [...prev, ...splitIntoSingleItems(item)]);
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
    localStorage.removeItem("kiosk-cart");
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, orderType, setOrderType }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
