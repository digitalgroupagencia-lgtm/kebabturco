import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import { getEmbedScreen, isEmbedded, isGandiaFoodSource } from "@/lib/embed-mode";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { useMesaFromUrl } from "@/hooks/useMesaFromUrl";
import {
  loadAnyStoredActiveOrder,
  saveStoredActiveOrder,
  clearStoredActiveOrder,
} from "@/features/customer/useActiveOrderStorage";
import { readOrderIdFromUrl, readCustomerScreenFromUrl, syncActiveOrderUrl } from "@/lib/customerOrderUrl";
import {
  clearMesaBindingStorage,
  loadSavedLang,
  loadSavedMesaToken,
  loadSavedOrderType,
  loadSavedCustomerName,
  loadSavedCustomerPhone,
  loadSavedDeliveryAddress,
  loadSavedTableNumber,
  resolveScreenAfterLanguageSkip,
  saveSavedCustomerName,
  saveSavedCustomerPhone,
  saveSavedDeliveryAddress,
  saveSavedMesaToken,
  saveSavedTableNumber,
  shouldSkipLanguageScreen,
  readLangFromUrl,
  saveSavedLang,
} from "@/lib/customerSession";
import { useTableSessionBinding } from "@/hooks/useTableSessionBinding";
import { customerScreenFromPathname } from "@/lib/routeRedirects";
import { DEFAULT_DIAL_CODE } from "@/lib/phoneNumber";

type Screen = "splash" | "language" | "storeSelect" | "orderType" | "home" | "product" | "review" | "payment" | "cashPending" | "confirmation" | "tracking" | "account";
export type { Screen };
export type PaymentMethodId = "card" | "cash" | "pix" | "apple" | "google" | "counter" | "link";
export type AccountFocus = "orders" | "profile";

interface OrderContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  accountFocus: AccountFocus;
  setAccountFocus: (f: AccountFocus) => void;
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
  phoneDialCode: string;
  setPhoneDialCode: (code: string) => void;
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
  orderPaymentStatus: "pending" | "paid";
  setOrderPaymentStatus: (s: "pending" | "paid") => void;
  productReturnScreen: Screen;
  setProductReturnScreen: (s: Screen) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { storeId: resolvedStoreId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? resolvedStoreId ?? "";
  const { mesa, loading: mesaLoading } = useMesaFromUrl(effectiveStoreId || null);
  const { setOrderType, orderType, clearOrderType } = useCart();

  const initialScreen: Screen = (() => {
    if (typeof window === "undefined") return "language";
    if (isGandiaFoodSource()) return "home";
    if (isEmbedded()) return "home";
    const embedScreen = getEmbedScreen();
    if (embedScreen) return embedScreen;

    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    const p = params.get("screen");
    const valid: Screen[] = ["splash", "language", "storeSelect", "orderType", "home", "product", "review", "payment", "cashPending", "confirmation", "tracking", "account"];

    if (isLovableEditorPreview()) {
      if (isPreview && valid.includes(p as Screen)) return p as Screen;
      return "language";
    }

    const orderParam = params.get("order");
    const stored = loadAnyStoredActiveOrder();

    const routeScreen = customerScreenFromPathname(window.location.pathname);
    if (routeScreen && valid.includes(routeScreen as Screen)) return routeScreen as Screen;

    if (isPreview && valid.includes(p as Screen)) {
      return p as Screen;
    }

    if (orderParam || stored?.orderId) {
      const urlScreen = readCustomerScreenFromUrl();
      if (urlScreen === "cashPending" || p === "cashPending") return "cashPending";
      if (urlScreen === "tracking" || p === "tracking") return "tracking";
      if (urlScreen === "confirmation" || stored?.screen === "confirmation" || p === "confirmation") return "confirmation";
      return "confirmation";
    }

    if (shouldSkipLanguageScreen()) {
      if (valid.includes(p as Screen)) return p as Screen;
      return resolveScreenAfterLanguageSkip();
    }

    if (valid.includes(p as Screen)) return p as Screen;

    // Sempre começar pelo idioma na entrada do domínio — não pular por causa de cache antigo
    return "language";
  })();

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [accountFocus, setAccountFocus] = useState<AccountFocus>("profile");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") return params.get("productId");
    return null;
  });
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("bestsellers");
  const [orderNumber, setOrderNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    const urlOrder = readOrderIdFromUrl();
    if (urlOrder) return "";
    return loadAnyStoredActiveOrder()?.orderNumber || "";
  });
  const [activeOrderId, setActiveOrderIdState] = useState(() => {
    if (typeof window === "undefined") return "";
    return readOrderIdFromUrl() || loadAnyStoredActiveOrder()?.orderId || "";
  });
  const [trackingOrderId, setTrackingOrderId] = useState(() => {
    if (typeof window === "undefined") return "";
    return readOrderIdFromUrl() || loadAnyStoredActiveOrder()?.orderId || "";
  });

  const setActiveOrderId = (id: string) => {
    setActiveOrderIdState(id);
    if (!id) clearStoredActiveOrder();
  };

  useEffect(() => {
    if (!effectiveStoreId) return;
    const stored = loadAnyStoredActiveOrder();
    if (stored && stored.storeId !== effectiveStoreId) {
      clearStoredActiveOrder();
      setActiveOrderIdState("");
      setTrackingOrderId("");
      setOrderNumber("");
      syncActiveOrderUrl(null);
      return;
    }
    if (stored && !activeOrderId) {
      setActiveOrderIdState(stored.orderId);
      setTrackingOrderId(stored.orderId);
      setOrderNumber(stored.orderNumber);
    }
  }, [effectiveStoreId, activeOrderId]);

  useEffect(() => {
    if (activeOrderId && orderNumber && effectiveStoreId && !isEmergencyFallbackStoreId(effectiveStoreId)) {
      saveStoredActiveOrder({
        orderId: activeOrderId,
        orderNumber,
        storeId: effectiveStoreId,
        screen: screen === "confirmation" || screen === "tracking" || screen === "cashPending" ? screen : undefined,
      });
    }
  }, [activeOrderId, orderNumber, effectiveStoreId, screen]);

  useEffect(() => {
    if (!activeOrderId) {
      syncActiveOrderUrl(null);
      return;
    }
    if (screen === "confirmation" || screen === "tracking") {
      syncActiveOrderUrl(activeOrderId, screen);
    } else {
      syncActiveOrderUrl(activeOrderId);
    }
  }, [activeOrderId, screen]);
  const [tableNumber, setTableNumberState] = useState(() =>
    typeof window === "undefined" ? "" : loadSavedTableNumber(),
  );
  const setTableNumber = (value: string) => {
    setTableNumberState(value);
    saveSavedTableNumber(value);
  };
  const [mesaLocked, setMesaLocked] = useState(() => Boolean(loadSavedMesaToken()));
  const [mesaTableId, setMesaTableId] = useState<string | null>(null);
  const [mesaQrToken, setMesaQrToken] = useState<string | null>(() => loadSavedMesaToken());
  const [customerName, setCustomerNameState] = useState(() =>
    typeof window === "undefined" ? "" : loadSavedCustomerName(),
  );
  const setCustomerName = (value: string) => {
    setCustomerNameState(value);
    saveSavedCustomerName(value);
  };
  const savedPhone = typeof window !== "undefined" ? loadSavedCustomerPhone() : null;
  const savedDelivery = typeof window !== "undefined" ? loadSavedDeliveryAddress() : null;
  const [phoneDialCode, setPhoneDialCodeState] = useState(savedPhone?.dialCode ?? DEFAULT_DIAL_CODE);
  const [customerPhone, setCustomerPhoneState] = useState(savedPhone?.local ?? "");
  const setPhoneDialCode = (code: string) => {
    setPhoneDialCodeState(code);
    saveSavedCustomerPhone(code, customerPhone);
  };
  const setCustomerPhone = (value: string) => {
    setCustomerPhoneState(value);
    saveSavedCustomerPhone(phoneDialCode, value);
  };
  const [deliveryAddress, setDeliveryAddressState] = useState(savedDelivery?.street ?? "");
  const [deliveryNumber, setDeliveryNumberState] = useState(savedDelivery?.number ?? "");
  const [deliveryComplement, setDeliveryComplementState] = useState(savedDelivery?.complement ?? "");
  const [deliveryPostalCode, setDeliveryPostalCodeState] = useState(savedDelivery?.postalCode ?? "");
  const [deliveryCity, setDeliveryCityState] = useState(savedDelivery?.city ?? "");
  const [deliveryNotes, setDeliveryNotesState] = useState(savedDelivery?.notes ?? "");

  const setDeliveryAddress = (value: string) => {
    setDeliveryAddressState(value);
    saveSavedDeliveryAddress({
      street: value,
      number: deliveryNumber,
      complement: deliveryComplement,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      notes: deliveryNotes,
    });
  };
  const setDeliveryNumber = (value: string) => {
    setDeliveryNumberState(value);
    saveSavedDeliveryAddress({
      street: deliveryAddress,
      number: value,
      complement: deliveryComplement,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      notes: deliveryNotes,
    });
  };
  const setDeliveryComplement = (value: string) => {
    setDeliveryComplementState(value);
    saveSavedDeliveryAddress({
      street: deliveryAddress,
      number: deliveryNumber,
      complement: value,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      notes: deliveryNotes,
    });
  };
  const setDeliveryPostalCode = (value: string) => {
    setDeliveryPostalCodeState(value);
    saveSavedDeliveryAddress({
      street: deliveryAddress,
      number: deliveryNumber,
      complement: deliveryComplement,
      postalCode: value,
      city: deliveryCity,
      notes: deliveryNotes,
    });
  };
  const setDeliveryCity = (value: string) => {
    setDeliveryCityState(value);
    saveSavedDeliveryAddress({
      street: deliveryAddress,
      number: deliveryNumber,
      complement: deliveryComplement,
      postalCode: deliveryPostalCode,
      city: value,
      notes: deliveryNotes,
    });
  };
  const setDeliveryNotes = (value: string) => {
    setDeliveryNotesState(value);
    saveSavedDeliveryAddress({
      street: deliveryAddress,
      number: deliveryNumber,
      complement: deliveryComplement,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      notes: value,
    });
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<"pending" | "paid">("pending");
  const [productReturnScreen, setProductReturnScreen] = useState<Screen>("home");

  useEffect(() => {
    if (mesaLoading) return;
    if (mesa?.locked) {
      setTableNumber(mesa.mesaNumber);
      saveSavedTableNumber(mesa.mesaNumber);
      setMesaTableId(mesa.tableId);
      setMesaLocked(true);
      setMesaQrToken(mesa.qrToken);
      saveSavedMesaToken(mesa.qrToken);
      setOrderType("here");
      const qrLang = mesa.scanLang || readLangFromUrl();
      if (qrLang && ["pt", "en", "es", "fr"].includes(qrLang)) {
        saveSavedLang(qrLang as "pt" | "en" | "es" | "fr");
      }
      return;
    }
    if (!loadSavedMesaToken()) {
      setMesaLocked(false);
      setMesaTableId(null);
      setMesaQrToken(null);
    }
  }, [mesa, mesaLoading, setOrderType]);

  const handleMesaSessionClosed = useCallback(() => {
    setMesaLocked(false);
    setMesaTableId(null);
    setMesaQrToken(null);
    setTableNumber("");
    if (orderType === "here") clearOrderType();
  }, [orderType, clearOrderType]);

  useTableSessionBinding(
    effectiveStoreId,
    mesaQrToken,
    mesaLocked,
    handleMesaSessionClosed,
  );

  const clearMesaLock = useCallback(() => {
    setMesaLocked(false);
    setMesaTableId(null);
    setMesaQrToken(null);
    setTableNumber("");
    clearMesaBindingStorage();
    if (orderType === "here") clearOrderType();
  }, [orderType, clearOrderType]);

  const generateOrderNumber = () => {
    setOrderNumber(String(Math.floor(100 + Math.random() * 900)));
  };

  return (
    <OrderContext.Provider
      value={{
        screen,
        setScreen,
        accountFocus,
        setAccountFocus,
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
        phoneDialCode,
        setPhoneDialCode,
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
        orderPaymentStatus,
        setOrderPaymentStatus,
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
