import React, { createContext, useContext, useState } from "react";
import { useResolvedStore } from "@/hooks/useResolvedStore";

type Screen = "splash" | "language" | "storeSelect" | "orderType" | "home" | "product" | "review" | "payment" | "confirmation";
export type PaymentMethodId = "card" | "cash" | "pix" | "apple" | "google" | "counter" | "link";

interface OrderContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  /** ID do item do carrinho sendo editado (preserva customizações) */
  editingCartItemId: string | null;
  setEditingCartItemId: (id: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  orderNumber: string;
  generateOrderNumber: () => void;
  storeId: string;
  tableNumber: string;
  setTableNumber: (n: string) => void;
  customerName: string;
  setCustomerName: (n: string) => void;
  customerPhone: string;
  setCustomerPhone: (p: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  deliveryNumber: string;
  setDeliveryNumber: (v: string) => void;
  deliveryComplement: string;
  setDeliveryComplement: (v: string) => void;
  deliveryPostalCode: string;
  setDeliveryPostalCode: (v: string) => void;
  deliveryCity: string;
  setDeliveryCity: (v: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (v: string) => void;
  paymentMethod: PaymentMethodId | null;
  setPaymentMethod: (m: PaymentMethodId | null) => void;
  productReturnScreen: Screen;
  setProductReturnScreen: (s: Screen) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { storeId: resolvedStoreId, selectedStoreId } = useResolvedStore();
  const initialScreen: Screen = (() => {
    if (typeof window === "undefined") return "language";
    const p = new URLSearchParams(window.location.search).get("screen");
    const valid: Screen[] = ["splash","language","storeSelect","orderType","home","product","review","payment","confirmation"];
    return (valid.includes(p as Screen) ? (p as Screen) : "language");
  })();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("bestsellers");
  const [orderNumber, setOrderNumber] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [productReturnScreen, setProductReturnScreen] = useState<Screen>("home");

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
        editingCartItemId,
        setEditingCartItemId,
        selectedCategory,
        setSelectedCategory,
        orderNumber,
        generateOrderNumber,
        // Pedidos vão para a unidade escolhida pelo cliente (quando o tenant tem 2+ unidades).
        // Branding/idiomas/totem_config continuam vindo do `resolvedStoreId` (store primária).
        storeId: selectedStoreId ?? resolvedStoreId ?? "",
        tableNumber,
        setTableNumber,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        deliveryAddress,
        setDeliveryAddress,
        deliveryNumber,
        setDeliveryNumber,
        deliveryComplement,
        setDeliveryComplement,
        deliveryPostalCode,
        setDeliveryPostalCode,
        deliveryCity,
        setDeliveryCity,
        deliveryNotes,
        setDeliveryNotes,
        paymentMethod,
        setPaymentMethod,
        productReturnScreen,
        setProductReturnScreen,
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
