import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useCart } from "@/customer/contexts/CartContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import { getEmbedScreen, isEmbedded, isGandiaFoodSource } from "@/lib/embed-mode";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import { useMesaFromUrl } from "@/hooks/useMesaFromUrl";
import {
  loadAnyStoredActiveOrder,
  saveStoredActiveOrder,
  clearStoredActiveOrder,
} from "@/customer/active-order/useActiveOrderStorage";
import {
  readOrderIdFromUrl,
  readOrderTokenFromUrl,
  readCustomerScreenFromUrl,
  syncActiveOrderUrl,
} from "@/lib/customerOrderUrl";
import {
  clearMesaBindingStorage,
  loadSavedLang,
  loadSavedMesaToken,
  loadSavedOrderType,
  loadSavedCustomerName,
  loadSavedCustomerEmail,
  loadSavedCustomerPhone,
  loadSavedDeliveryAddress,
  loadSavedTableNumber,
  resolveScreenAfterLanguageSkip,
  saveSavedCustomerName,
  saveSavedCustomerEmail,
  saveSavedCustomerPhone,
  saveSavedDeliveryAddress,
  type SavedDeliveryAddress,
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
export type PaymentMethodId = "card" | "cash" | "pix" | "apple" | "google" | "counter" | "link" | "redsys" | "bizum";
export type AccountFocus = "orders" | "profile" | "loyalty";

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
  mesaManual: boolean;
  mesaTableId: string | null;
  confirmManualMesa: (tableNumber: string, tableId: string) => void;
  confirmQrMesa: (tableNumber: string, tableId: string, qrToken: string) => void;
  clearMesaLock: () => void;
  customerName: string;
  setCustomerName: (n: string) => void;
  customerPhone: string;
  setCustomerPhone: (p: string) => void;
  customerEmail: string;
  setCustomerEmail: (e: string) => void;
  phoneDialCode: string;
  setPhoneDialCode: (code: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  deliveryNumber: string;
  setDeliveryNumber: (v: string) => void;
  deliveryFloor: string;
  setDeliveryFloor: (v: string) => void;
  deliveryDoor: string;
  setDeliveryDoor: (v: string) => void;
  deliveryBlock: string;
  setDeliveryBlock: (v: string) => void;
  deliveryPostalCode: string;
  setDeliveryPostalCode: (v: string) => void;
  deliveryCity: string;
  setDeliveryCity: (v: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (v: string) => void;
  hydrateDeliveryAddress: (addr: SavedDeliveryAddress) => void;
  hydrateCustomerProfile: (profile: {
    name: string;
    phoneDialCode: string;
    phoneLocal: string;
    delivery: SavedDeliveryAddress;
  }) => void;
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

    // Sempre começar pelo idioma na entrada do domínio, não pular por causa de cache antigo
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
      const keepToken = readOrderTokenFromUrl() || loadAnyStoredActiveOrder()?.orderToken || undefined;
      saveStoredActiveOrder({
        orderId: activeOrderId,
        orderNumber,
        storeId: effectiveStoreId,
        orderToken: keepToken,
        screen: screen === "confirmation" || screen === "tracking" ? screen : undefined,
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
  const [mesaManual, setMesaManual] = useState(false);
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
  const [customerEmail, setCustomerEmailState] = useState(() =>
    typeof window === "undefined" ? "" : loadSavedCustomerEmail(),
  );
  const setCustomerEmail = (value: string) => {
    setCustomerEmailState(value);
    saveSavedCustomerEmail(value);
  };
  const [deliveryAddress, setDeliveryAddressState] = useState(savedDelivery?.street ?? "");
  const [deliveryNumber, setDeliveryNumberState] = useState(savedDelivery?.number ?? "");
  const [deliveryFloor, setDeliveryFloorState] = useState(savedDelivery?.floor ?? "");
  const [deliveryDoor, setDeliveryDoorState] = useState(savedDelivery?.door ?? "");
  const [deliveryBlock, setDeliveryBlockState] = useState(savedDelivery?.block ?? "");
  const [deliveryPostalCode, setDeliveryPostalCodeState] = useState(savedDelivery?.postalCode ?? "");
  const [deliveryCity, setDeliveryCityState] = useState(savedDelivery?.city ?? "");
  const [deliveryNotes, setDeliveryNotesState] = useState(savedDelivery?.notes ?? "");

  const persistDeliveryAddress = (patch: Partial<SavedDeliveryAddress>) => {
    saveSavedDeliveryAddress({
      street: patch.street ?? deliveryAddress,
      number: patch.number ?? deliveryNumber,
      floor: patch.floor ?? deliveryFloor,
      door: patch.door ?? deliveryDoor,
      block: patch.block ?? deliveryBlock,
      postalCode: patch.postalCode ?? deliveryPostalCode,
      city: patch.city ?? deliveryCity,
      notes: patch.notes ?? deliveryNotes,
    });
  };

  const setDeliveryAddress = (value: string) => {
    setDeliveryAddressState(value);
    persistDeliveryAddress({ street: value });
  };
  const setDeliveryNumber = (value: string) => {
    setDeliveryNumberState(value);
    persistDeliveryAddress({ number: value });
  };
  const setDeliveryFloor = (value: string) => {
    setDeliveryFloorState(value);
    persistDeliveryAddress({ floor: value });
  };
  const setDeliveryDoor = (value: string) => {
    setDeliveryDoorState(value);
    persistDeliveryAddress({ door: value });
  };
  const setDeliveryBlock = (value: string) => {
    setDeliveryBlockState(value);
    persistDeliveryAddress({ block: value });
  };
  const setDeliveryPostalCode = (value: string) => {
    setDeliveryPostalCodeState(value);
    persistDeliveryAddress({ postalCode: value });
  };
  const setDeliveryCity = (value: string) => {
    setDeliveryCityState(value);
    persistDeliveryAddress({ city: value });
  };
  const setDeliveryNotes = (value: string) => {
    setDeliveryNotesState(value);
    persistDeliveryAddress({ notes: value });
  };

  const hydrateDeliveryAddress = useCallback((addr: SavedDeliveryAddress) => {
    setDeliveryAddressState(addr.street);
    setDeliveryNumberState(addr.number);
    setDeliveryFloorState(addr.floor);
    setDeliveryDoorState(addr.door);
    setDeliveryBlockState(addr.block);
    setDeliveryPostalCodeState(addr.postalCode);
    setDeliveryCityState(addr.city);
    setDeliveryNotesState(addr.notes);
    saveSavedDeliveryAddress(addr);
  }, []);

  const hydrateCustomerProfile = useCallback(
    (profile: {
      name: string;
      phoneDialCode: string;
      phoneLocal: string;
      delivery: SavedDeliveryAddress;
    }) => {
      setCustomerNameState(profile.name);
      saveSavedCustomerName(profile.name);
      setPhoneDialCodeState(profile.phoneDialCode);
      setCustomerPhoneState(profile.phoneLocal);
      saveSavedCustomerPhone(profile.phoneDialCode, profile.phoneLocal);
      hydrateDeliveryAddress(profile.delivery);
    },
    [hydrateDeliveryAddress],
  );

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
      setMesaManual(false);
      setMesaQrToken(mesa.qrToken);
      saveSavedMesaToken(mesa.qrToken);
      setOrderType("here");
      const qrLang = mesa.scanLang || readLangFromUrl();
      if (qrLang && ["pt", "en", "es", "fr"].includes(qrLang)) {
        saveSavedLang(qrLang as "pt" | "en" | "es" | "fr");
      }
      const scannedFromUrl = Boolean(new URLSearchParams(window.location.search).get("t")?.trim());
      if (scannedFromUrl) {
        setScreen("home");
      }
      return;
    }
    if (!loadSavedMesaToken()) {
      setMesaLocked(false);
      setMesaTableId(null);
      setMesaQrToken(null);
    }
  }, [mesa, mesaLoading, setOrderType, setScreen]);

  const handleMesaSessionClosed = useCallback(() => {
    setMesaLocked(false);
    setMesaManual(false);
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

  const confirmManualMesa = useCallback((tableNumber: string, tableId: string) => {
    setTableNumber(tableNumber);
    setMesaTableId(tableId);
    setMesaManual(true);
    setMesaLocked(false);
    setMesaQrToken(null);
    clearMesaBindingStorage();
    setOrderType("here");
  }, [setOrderType]);

  const confirmQrMesa = useCallback((tableNumber: string, tableId: string, qrToken: string) => {
    setTableNumber(tableNumber);
    saveSavedTableNumber(tableNumber);
    setMesaTableId(tableId);
    setMesaManual(false);
    setMesaLocked(true);
    setMesaQrToken(qrToken);
    saveSavedMesaToken(qrToken);
    setOrderType("here");
  }, [setOrderType]);

  const clearMesaLock = useCallback(() => {
    setMesaLocked(false);
    setMesaManual(false);
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
        mesaManual,
        mesaTableId,
        confirmManualMesa,
        confirmQrMesa,
        clearMesaLock,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerEmail,
        setCustomerEmail,
        phoneDialCode,
        setPhoneDialCode,
        deliveryAddress,
        setDeliveryAddress,
        deliveryNumber,
        setDeliveryNumber,
        deliveryFloor,
        setDeliveryFloor,
        deliveryDoor,
        setDeliveryDoor,
        deliveryBlock,
        setDeliveryBlock,
        deliveryPostalCode,
        setDeliveryPostalCode,
        deliveryCity,
        setDeliveryCity,
        deliveryNotes,
        setDeliveryNotes,
        hydrateDeliveryAddress,
        hydrateCustomerProfile,
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
