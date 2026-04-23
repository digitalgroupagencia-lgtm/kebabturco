import React, { createContext, useContext, useState, useEffect } from "react";

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
  orderType: "here" | "takeaway" | null;
  setOrderType: (t: "here" | "takeaway") => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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
      return parsed;
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

  const updateItem = (id: string, item: Omit<CartItem, "id">) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...item, id } : i)));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return removeItem(id);
    setItems(prev => prev.map(i => i.id === id ? {
      ...i,
      quantity: qty,
      totalPrice: i.unitPrice * qty
    } : i));
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
