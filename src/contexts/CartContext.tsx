import React, { createContext, useContext, useState, useEffect } from "react";
import type { Product, Extra, Size } from "@/data/products";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedSize?: Size;
  selectedExtras: { extra: Extra; quantity: number }[];
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  orderType: "here" | "takeaway" | null;
  setOrderType: (t: "here" | "takeaway") => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("kiosk-cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [orderType, setOrderType] = useState<"here" | "takeaway" | null>(null);

  useEffect(() => {
    localStorage.setItem("kiosk-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    const id = crypto.randomUUID();
    setItems(prev => [...prev, { ...item, id }]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return removeItem(id);
    setItems(prev => prev.map(i => i.id === id ? {
      ...i,
      quantity: qty,
      totalPrice: (i.totalPrice / i.quantity) * qty
    } : i));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("kiosk-cart");
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, orderType, setOrderType }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
