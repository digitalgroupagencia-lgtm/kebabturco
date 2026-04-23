import React, { createContext, useContext, useState } from "react";

type Screen = "splash" | "language" | "orderType" | "home" | "product" | "review" | "payment" | "confirmation";
export type PaymentMethodId = "card" | "cash" | "pix" | "apple" | "google" | "counter" | "link";

interface OrderContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  orderNumber: string;
  generateOrderNumber: () => void;
  storeId: string;
  tableNumber: string;
  setTableNumber: (n: string) => void;
  paymentMethod: PaymentMethodId | null;
  setPaymentMethod: (m: PaymentMethodId | null) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);
const DEFAULT_STORE_ID = "b0000000-0000-0000-0000-000000000001";

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("bestsellers");
  const [orderNumber, setOrderNumber] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);

  const generateOrderNumber = () => {
    setOrderNumber(String(Math.floor(100 + Math.random() * 900)));
  };

  return (
    <OrderContext.Provider
      value={{
        screen,
        setScreen,
        selectedProductId,
        setSelectedProductId,
        selectedCategory,
        setSelectedCategory,
        orderNumber,
        generateOrderNumber,
        storeId: DEFAULT_STORE_ID,
        tableNumber,
        setTableNumber,
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
};
