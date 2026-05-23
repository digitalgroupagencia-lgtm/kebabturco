import React, { createContext, useContext, useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { getEmbedScreen, isEmbedded, isGandiaFoodSource } from "@/lib/embed-mode";
import { useMesaFromUrl } from "@/hooks/useMesaFromUrl";
import {
  loadStoredActiveOrder,
  saveStoredActiveOrder,
  clearStoredActiveOrder,
} from "@/features/customer/useActiveOrder";

type Screen = "splash" | "language" | "storeSelect" | "orderType" | "home" | "product" | "review" | "payment" | "confirmation" | "tracking" | "account";
export type PaymentMethodId = "card" | "cash" | "pix" | "apple" | "google" | "counter" | "link";

interface OrderContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  editingCartItemId: string | null;
  setEditingCartItemId: (id: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  orderNumber: string;
  setOrderNumber: (n: string) => void;
  activeOrderId: string;
  setActiveOrderId: (id: string) => void;
  trackingOrderId: string;
  setTrackingOrderId: (id: string) => void;
  generateOrderNumber: () => void;
  storeId: string;
  tableNumber: string;
  setTableNumber: (n: string) => void;
  mesaLocked: boolean;
  mesaTableId: string | null;
  clearMesaLock: () => void;
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
  const effectiveStoreId = selectedStoreId ?? resolvedStoreId ?? "";
  const { mesa, loading: mesaLoading } = useMesaFromUrl(effectiveStoreId || null);
  const { setOrderType } = useCart();

  const initialScreen: Screen = (() => {
    if (typeof window === "undefined") return "language";
    if (isGandiaFoodSource()) return "home";
    if (isEmbedded()) return "home";
    const embedScreen = getEmbedScreen();
    if (embedScreen) return embedScreen;
    const p = new URLSearchParams(window.location.search).get("screen");
    const orderParam = new URLSearchParams(window.location.search).get("order");
    const valid: Screen[] = ["splash", "language", "storeSelect", "orderType", "home", "product", "review", "payment", "confirmation", "tracking", "account"];
    if (p === "tracking" && orderParam) return "tracking";
    return valid.includes(p as Screen) ? (p as Screen) : "language";
  })();

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("bestsellers");
  const [orderNumber, setOrderNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    const urlOrder = new URLSearchParams(window.location.search).get("order");
    if (urlOrder) return "";
    const stored = loadStoredActiveOrder(effectiveStoreId);
    return stored?.orderNumber || "";
  });
  const [activeOrderId, setActiveOrderIdState] = useState(() => {
    if (typeof window === "undefined") return "";
    const urlOrder = new URLSearchParams(window.location.search).get("order");
    if (urlOrder) return urlOrder;
    const stored = loadStoredActiveOrder(effectiveStoreId);
    return stored?.orderId || "";
  });
  const [trackingOrderId, setTrackingOrderId] = useState(() => {
    if (typeof window === "undefined") return "";
    const urlOrder = new URLSearchParams(window.location.search).get("order");
    if (urlOrder) return urlOrder;
    const stored = loadStoredActiveOrder(effectiveStoreId);
    return stored?.orderId || "";
  });

  const setActiveOrderId = (id: string) => {
    setActiveOrderIdState(id);
    if (!id) clearStoredActiveOrder();
  };

  useEffect(() => {
    if (!effectiveStoreId || activeOrderId) return;
    const stored = loadStoredActiveOrder(effectiveStoreId);
    if (stored) {
      setActiveOrderIdState(stored.orderId);
      setTrackingOrderId(stored.orderId);
      setOrderNumber(stored.orderNumber);
    }
  }, [effectiveStoreId, activeOrderId]);

  useEffect(() => {
    if (activeOrderId && orderNumber && effectiveStoreId) {
      saveStoredActiveOrder({ orderId: activeOrderId, orderNumber, storeId: effectiveStoreId });
    }
  }, [activeOrderId, orderNumber, effectiveStoreId]);
  const [tableNumber, setTableNumber] = useState("");
  const [mesaLocked, setMesaLocked] = useState(false);
  const [mesaTableId, setMesaTableId] = useState<string | null>(null);
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

  useEffect(() => {
    if (mesaLoading || !mesa?.locked) return;
    setTableNumber(mesa.mesaNumber);
    setMesaTableId(mesa.tableId);
    setMesaLocked(true);
    setOrderType("here");
  }, [mesa, mesaLoading, setOrderType]);

  const clearMesaLock = () => {
    setMesaLocked(false);
    setMesaTableId(null);
    setTableNumber("");
  };

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
        setOrderNumber,
        activeOrderId,
        setActiveOrderId,
        trackingOrderId,
        setTrackingOrderId,
        generateOrderNumber,
        storeId: effectiveStoreId,
        tableNumber,
        setTableNumber,
        mesaLocked,
        mesaTableId,
        clearMesaLock,
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
