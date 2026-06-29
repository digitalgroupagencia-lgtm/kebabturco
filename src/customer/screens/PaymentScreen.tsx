import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StripeElementLocale } from "@stripe/stripe-js";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/customer/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { useStoreCoords } from "@/hooks/useStoreCoords";
import { useCustomerDeliveryDistance } from "@/hooks/useCustomerDeliveryDistance";
import { distanceKm } from "@/lib/geolocation";
import { trackMarketingEvent } from "@/lib/marketingAnalytics";
import UseMyLocationButton from "@/components/customer/UseMyLocationButton";
import StripePaymentForm, { type StripeFormCopy } from "@/components/StripePaymentForm";
import {
  attachStripeOrderToPaymentIntent,
  createCustomerOrder,
  createStripePaymentIntent,
  enableStoreBizumPayments,
  fetchStoreFinancialProfile,
  validateCoupon,
  waitForOrderPaymentConfirmed,
} from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { tryPrintCheckoutOrder } from "@/services/checkoutPrintHelper";
import {
  DEMO_VISIT_COUPON_CODE,
  finalizeDemoVisitOrder,
  printVisitDemoOrder,
} from "@/services/visitPrintService";
import { inferStripePlatformStatus } from "@/lib/inferStripePlatformStatus";
import {
  loadSavedMesaToken,
  loadSavedOrderType,
  saveSavedCustomerName,
  saveSavedCustomerPhone,
  saveSavedCustomerEmail,
  saveSavedDeliveryAddress,
  hasCustomerProfile,
  formatDeliveryComplement,
} from "@/lib/customerSession";
import { appendLocalOrderHistory } from "@/lib/customerOrderHistory";
import { consumePushCoupon } from "@/lib/customerPushDeepLink";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { enableCustomerOrderAlerts } from "@/lib/customerOrderAlerts";
import { hasStripePublishableKey, type StripePublishableEnvironment } from "@/lib/stripePublishableKey";
import { preloadStripeCheckout } from "@/lib/stripeLoader";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";
import {
  computeRestaurantPortionEur,
  computePlatformDeductionEur,
  computePlatformFeeEur,
  computePlatformFeeCents,
} from "@/lib/processingFee";
import {
  resolveCheckoutMethods,
  requiresPrepayment,
  shouldPrintAfterCheckout,
  stripeConfigIssue,
} from "@/lib/paymentPolicy";
import { syncActiveOrderUrl } from "@/lib/customerOrderUrl";
import {
  clearStripeCheckoutSession,
  loadStripeCheckoutSession,
  readStripeRedirectFromUrl,
  saveStripeCheckoutSession,
} from "@/lib/stripeCheckoutSession";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import { isValidOptionalEmail, normalizeOptionalEmail } from "@/lib/emailValidation";
import CustomerEmailField from "@/components/customer/CustomerEmailField";
import PhoneInput from "@/components/PhoneInput";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, User, Phone, MapPin, Loader2, AlertCircle, Sparkles } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";
import { useStoreOpenStatus } from "@/hooks/useStoreOpenStatus";
import StoreClosedDialog from "@/customer/components/StoreClosedDialog";
import SellerCheckoutForm from "@/customer/components/SellerCheckoutForm";
import { useSellerMode } from "@/contexts/SellerModeContext";
import { CUSTOMER_ACTION_FOOTER_PAD_CLASS } from "@/lib/storefrontFooter";



const METHOD_DEFS: { id: PaymentMethodId; icon: typeof CreditCard }[] = [
  { id: "bizum", icon: Smartphone },
  { id: "card", icon: CreditCard },
  { id: "cash", icon: Banknote },
  { id: "pix", icon: QrCode },
  { id: "apple", icon: Smartphone },
  { id: "google", icon: Smartphone },
  { id: "link", icon: Link2 },
  { id: "counter", icon: Store },
];

const METHOD_LABELS: Record<PaymentMethodId, Record<string, string>> = {
  card: { pt: "Cartão", en: "Card", es: "Tarjeta", fr: "Carte" },
  redsys: { pt: "Redsys", en: "Redsys", es: "Redsys", fr: "Redsys" },
  bizum: { pt: "Bizum", en: "Bizum", es: "Bizum", fr: "Bizum" },
  cash: { pt: "Dinheiro", en: "Cash", es: "Efectivo", fr: "Espèces" },
  pix: { pt: "Pix", en: "Pix", es: "Pix", fr: "Pix" },
  apple: { pt: "Apple Pay", en: "Apple Pay", es: "Apple Pay", fr: "Apple Pay" },
  google: { pt: "Google Pay", en: "Google Pay", es: "Google Pay", fr: "Google Pay" },
  link: { pt: "Link de pagamento", en: "Payment link", es: "Link de pago", fr: "Lien de paiement" },
  counter: { pt: "Pagar no balcão", en: "Pay at counter", es: "Pago en mostrador", fr: "Payer au comptoir" },
};

const METHOD_SUBS: Record<PaymentMethodId, Record<string, string>> = {
  card: { pt: "Pagamento seguro online", en: "Secure online payment", es: "Pago seguro online", fr: "Paiement sécurisé en ligne" },
  redsys: { pt: "", en: "", es: "", fr: "" },
  bizum: {
    pt: "Pagamento móvel na app Bizum",
    en: "Mobile payment in the Bizum app",
    es: "Pago móvil en la app Bizum",
    fr: "Paiement mobile via l'app Bizum",
  },
  cash: { pt: "Pagamento no caixa", en: "Pay at register", es: "Pago en caja", fr: "Paiement à la caisse" },
  pix: { pt: "Pagamento instantâneo", en: "Instant payment", es: "Pago instantáneo", fr: "Paiement instantané" },
  apple: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  google: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  link: { pt: "Receba um link", en: "Get a link", es: "Recibe un enlace", fr: "Recevoir un lien" },
  counter: { pt: "Pague ao retirar", en: "Pay when picking up", es: "Paga al recoger tu pedido", fr: "Payer au retrait" },
};


const hiddenCheckoutFeature = (_name: string) => false;

function isOnlineCheckoutMethod(method: PaymentMethodId | null): method is "card" | "bizum" {
  return method === "card" || method === "bizum";
}

function isCounterCashMethod(method: PaymentMethodId | null): boolean {
  return method === "cash" || method === "counter";
}

const PaymentScreen = () => {
  const {
    setScreen,
    setOrderNumber,
    setActiveOrderId,
    setTrackingOrderId,
    setPaymentMethod,
    setOrderPaymentStatus,
    storeId,
    tableNumber,
    setTableNumber,
    mesaLocked,
    mesaManual,
    mesaTableId,
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
  } = useOrder();
  const { items, totalPrice, clearCart, orderType, setOrderType } = useCart();
  const { settings, loading: settingsLoading } = useOperationsSettings();
  const { loading: storeLoading } = useResolvedStore();
  const brandingCtx = useBranding();
  const { lang, t, tProduct } = useLanguage();
  const stripeLocale = lang as StripeElementLocale;
  const stripeFormCopy = useMemo<StripeFormCopy>(
    () => ({
      back: t("back"),
      phoneLabel: t("phoneLabel"),
      waitingBank: t("stripeWaitingBank"),
      waitingBankSub: t("stripeWaitingBankSub"),
      payLabel: t("stripePayLabel"),
      bizumPhoneHint: t("stripeBizumPhoneHint"),
      bizumDesktopHint: t("stripeBizumDesktopHint"),
      cardDesktopHint: t("stripeCardDesktopHint"),
      confirmBizumPhone: t("stripeConfirmBizumPhone"),
      confirmCard: t("stripeConfirmCard"),
      paymentDeclined: t("stripePaymentDeclined"),
      paymentPending: t("stripePaymentPending"),
      paymentCanceled: t("stripePaymentCanceled"),
      orderConfirmFailed: t("stripeOrderConfirmFailed"),
      recoverFailed: t("stripeRecoverFailed"),
      bizumMismatchTitle: t("stripeBizumMismatchTitle"),
      bizumMismatchBody: t("stripeBizumMismatchBody"),
      bizumMismatchBack: t("stripeBizumMismatchBack"),
      onlineUnavailable: t("stripeOnlineUnavailable"),
    }),
    [lang, t],
  );
  const logoUrl = brandingCtx?.settings?.logo_main_url ?? null;
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const selectedMethodRef = useRef<PaymentMethodId | null>(null);

  useEffect(() => {
    selectedMethodRef.current = selected;
  }, [selected]);
  const [processing, setProcessing] = useState(false);
  const [customerDistanceKm, setCustomerDistanceKm] = useState<number | null>(null);
  const storeCoords = useStoreCoords(storeId);

  useCustomerDeliveryDistance({
    enabled: orderType === "delivery" && Boolean(storeCoords),
    storeCoords,
    street: deliveryAddress,
    number: deliveryNumber,
    postal: deliveryPostalCode,
    city: deliveryCity,
    onDistanceKm: setCustomerDistanceKm,
  });
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);
  const [stripePaymentMeta, setStripePaymentMeta] = useState<{
    amountCents: number;
    restaurantPortionCents: number;
    onlineServiceFeeCents: number;
    platformFeeCents: number;
    estimatedStripeFeeCents: number;
    stripeConnectAccountId: string | null;
    connectEnvironment?: StripePublishableEnvironment;
    publishableKey?: string | null;
    checkoutPaymentMethod?: "card" | "bizum";
    paymentMethodTypes?: string[];
  } | null>(null);
  const [stripePreparedOrder, setStripePreparedOrder] = useState<{ order_id: string; order_number: string } | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnectEnvironment, setStripeConnectEnvironment] = useState<StripePublishableEnvironment>("live");
  const [showError, setShowError] = useState<null | "name" | "table" | "phone" | "email" | "address" | "number" | "postal" | "city" | "method" | "minOrder" | "zone" | "store">(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isDemoVisitCoupon, setIsDemoVisitCoupon] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [stripeCheckoutMethod, setStripeCheckoutMethod] = useState<"card" | "bizum">("card");
  const [stripePaymentLocked, setStripePaymentLocked] = useState(false);
  const [stripeCheckoutPreparing, setStripeCheckoutPreparing] = useState(false);
  const stripePrefetchRef = useRef<{
    key: string;
    method: "card" | "bizum";
    promise: ReturnType<typeof createStripePaymentIntent>;
  } | null>(null);
  const [recoveringCheckout, setRecoveringCheckout] = useState(false);
  // Checkout em 2 etapas: dados → pagamento. Mesas saltam directamente para pagamento.
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">(
    orderType === "here" ? "payment" : "details",
  );
  const { subscribe: subscribePush } = usePushNotifications();
  const channel = orderType === "delivery" ? "delivery" : "store";
  const openStatus = useStoreOpenStatus(channel);
  const [closedDialog, setClosedDialog] = useState(false);
  const sellerMode = useSellerMode();


  const isTableOrder = orderType === "here";
  const mesaValidated = isTableOrder && Boolean(mesaTableId) && Boolean(tableNumber.trim());
  const stripePublishableKey = hasStripePublishableKey(stripeConnectEnvironment);
  const prepaymentRequired = orderType ? requiresPrepayment(orderType, settings) : false;
  const stripeIssue =
    stripeConnectEnvironment === "test" && !stripePublishableKey && stripeEnabled
      ? "Pagamento com cartão de teste indisponível, falta a chave publicável de teste (pk_test) no site publicado."
      : stripeConfigIssue(stripeEnabled, stripePublishableKey);

  useEffect(() => {
    if (isTableOrder && !mesaValidated) {
      setScreen("orderType");
    }
  }, [isTableOrder, mesaValidated, setScreen]);
  const fullCustomerPhone = formatFullPhone(phoneDialCode, customerPhone);
  const orderTypeDb = isTableOrder ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway";

  useEffect(() => {
    if (storeId) {
      void trackMarketingEvent("checkout_start", { storeId, customerPhone: fullCustomerPhone });
    }
  }, [storeId, fullCustomerPhone]);

  const { quote: deliveryQuote } = useDeliveryFee(
    orderType === "delivery" ? storeId : null,
    deliveryPostalCode,
    deliveryCity,
    totalPrice,
    customerDistanceKm,
  );
  const deliveryFee = orderType === "delivery" ? deliveryQuote.fee : 0;
  const restaurantPortionEur = computeRestaurantPortionEur(totalPrice, deliveryFee, couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode.trim() || !storeId || isTableOrder) return;
    try {
      const cartPayload = items.map((it) => ({
        product_id: it.productId,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice ?? it.basePrice ?? 0),
        total_price: Number(it.totalPrice ?? 0),
      }));
      const result = await validateCoupon(storeId, couponCode.trim(), totalPrice, deliveryFee, cartPayload);
      if (!result.valid) {
        setCouponError(result.error || "Cupón inválido");
        setCouponDiscount(0);
        setCouponId(null);
        setIsDemoVisitCoupon(false);
        return;
      }
      setCouponDiscount(result.discount_amount || 0);
      setCouponId(result.coupon_id || null);
      setIsDemoVisitCoupon(Boolean(result.demo_visit));
      setCouponError(null);
    } catch {
      setCouponError("Erro ao validar cupón");
    }
  };

  const pushCouponLoaded = useRef(false);

  useEffect(() => {
    if (pushCouponLoaded.current || isTableOrder) return;
    const pending = consumePushCoupon();
    if (!pending) return;
    pushCouponLoaded.current = true;
    setCouponCode(pending);
  }, [isTableOrder]);

  useEffect(() => {
    if (!pushCouponLoaded.current || !couponCode.trim() || couponDiscount > 0 || isTableOrder || !storeId) return;
    if (items.length === 0 || totalPrice <= 0) return;
    void applyCoupon();
  }, [couponCode, couponDiscount, storeId, items.length, totalPrice, isTableOrder]);

  useEffect(() => {
    if (orderType) return;
    const saved = loadSavedOrderType();
    if (saved) setOrderType(saved);
  }, [orderType, setOrderType]);

  useEffect(() => {
    if (!orderType && items.length > 0) {
      setScreen("orderType");
    }
  }, [orderType, items.length, setScreen]);

  useEffect(() => {
    if (!storeId) return;
    fetchStoreFinancialProfile(storeId)
      .then((profile) => {
        const ready = isStripeConnectReady(profile);
        setStripeEnabled(ready);
        const platform = inferStripePlatformStatus(profile);
        const useTest =
          profile?.stripe_connect_environment === "test" ||
          Boolean(profile?.stripe_connect_test_simulated) ||
          (profile?.stripe_connect_environment !== "live" &&
            Boolean(platform?.productionBlocked) &&
            hasStripePublishableKey("test"));
        setStripeConnectEnvironment(useTest ? "test" : "live");
      })
      .catch(() => setStripeEnabled(false));
  }, [storeId]);

  useEffect(() => {
    if (!stripeEnabled || !stripePublishableKey) return;
    preloadStripeCheckout(stripeConnectEnvironment, null, stripeLocale);
  }, [stripeEnabled, stripePublishableKey, stripeConnectEnvironment, stripeLocale]);

  const buildStripePrefetchKey = (method: "card" | "bizum") =>
    `${method}:${storeId}:${Math.round(totalPrice * 100)}:${Math.round(deliveryFee * 100)}:${Math.round(couponDiscount * 100)}:${orderTypeDb}`;

  const resetStripeCheckoutState = useCallback(() => {
    setStripeClientSecret(null);
    setStripePaymentIntentId(null);
    setStripePaymentMeta(null);
    setStripePreparedOrder(null);
    setStripeCheckoutPreparing(false);
    setStripePaymentLocked(false);
    clearStripeCheckoutSession();
    stripePrefetchRef.current = null;
  }, []);

  useEffect(() => {
    if (!storeId || !stripeEnabled || !stripePublishableKey) return;
    if (isTableOrder) return;
    if (checkoutStep !== "details" && checkoutStep !== "payment") return;
    if (stripeClientSecret || stripeCheckoutPreparing || processing || recoveringCheckout) return;
    if (!selected || !isOnlineCheckoutMethod(selected)) {
      stripePrefetchRef.current = null;
      return;
    }

    const method: "card" | "bizum" = selected === "bizum" ? "bizum" : "card";
    const key = buildStripePrefetchKey(method);
    if (stripePrefetchRef.current?.key === key) return;

    stripePrefetchRef.current = {
      key,
      method,
      promise: createStripePaymentIntent({
        storeId,
        subtotalCents: Math.round(totalPrice * 100),
        deliveryCents: Math.round(deliveryFee * 100),
        discountCents: Math.round(couponDiscount * 100),
        orderType: orderTypeDb,
        paymentMethodType: method,
        customerEmail: normalizeOptionalEmail(customerEmail) ?? undefined,
      }),
    };
  }, [
    storeId,
    stripeEnabled,
    stripePublishableKey,
    isTableOrder,
    checkoutStep,
    selected,
    totalPrice,
    deliveryFee,
    couponDiscount,
    orderTypeDb,
    stripeClientSecret,
    stripeCheckoutPreparing,
    processing,
    recoveringCheckout,
  ]);




  const checkoutMethods = useMemo(() => {
    if (!orderType) return [];
    const ids = resolveCheckoutMethods({
      orderType,
      mesaValidated,
      settings,
      stripeReady: stripeEnabled,
      stripePublishableKey,
    });
    // Em entrega ao domicílio: Bizum + cartão (sem efectivo).
    const filteredIds =
      orderType === "delivery" ? ids.filter((id) => id === "card" || id === "bizum") : ids;
    return METHOD_DEFS.filter((m) => filteredIds.includes(m.id));
  }, [orderType, mesaValidated, settings, stripeEnabled, stripePublishableKey]);


  const grandTotal = restaurantPortionEur;

  const cardOrderFinancials = () => {
    const restaurantCents = Math.round(restaurantPortionEur * 100);
    const platformCents =
      stripePaymentMeta?.platformFeeCents ?? computePlatformFeeCents(restaurantCents);
    const serviceCents =
      stripePaymentMeta?.onlineServiceFeeCents ??
      Math.round(computePlatformDeductionEur(restaurantPortionEur) * 100);
    return {
      onlineServiceFeeCents: serviceCents,
      platformFeeCents: platformCents,
      stripeFeeCents:
        stripePaymentMeta?.estimatedStripeFeeCents ?? Math.max(0, serviceCents - platformCents),
      netToStoreCents: stripePaymentMeta?.restaurantPortionCents ?? restaurantCents,
      stripeConnectAccountId: stripePaymentMeta?.stripeConnectAccountId ?? null,
    };
  };

  const payButtonReady =
    (isDemoVisitCoupon && grandTotal <= 0.01) ||
    (checkoutMethods.length > 0 && !processing && !stripeClientSecret);

  useEffect(() => {
    if (checkoutMethods.length === 0) {
      setSelected(null);
      selectedMethodRef.current = null;
      return;
    }
    setSelected((current) => {
      if (current && checkoutMethods.some((m) => m.id === current)) {
        return current;
      }
      const cashMethod = checkoutMethods.find((m) => m.id === "cash");
      if (cashMethod) return "cash";
      const cardMethod = checkoutMethods.find((m) => m.id === "card");
      if (cardMethod) return "card";
      return checkoutMethods[0]?.id ?? null;
    });
  }, [checkoutMethods]);

  const selectPaymentMethod = (methodId: PaymentMethodId) => {
    selectedMethodRef.current = methodId;
    setSelected(methodId);
    setShowError(null);
    setPaymentError(null);
    stripePrefetchRef.current = null;
    if (isCounterCashMethod(methodId)) {
      setStripeClientSecret(null);
      setStripePaymentIntentId(null);
      setStripePaymentMeta(null);
      setStripePreparedOrder(null);
      clearStripeCheckoutSession();
    } else if (isOnlineCheckoutMethod(methodId)) {
      setStripeClientSecret(null);
      setStripePaymentIntentId(null);
      setStripePaymentMeta(null);
      setStripePreparedOrder(null);
    }
  };

  const validateDetailsStep = () => {
    if (!orderType) { setShowError("method"); return false; }
    if (isTableOrder) {
      if (!mesaValidated) { setShowError("table"); return false; }
      if (!isValidCustomerPhone(phoneDialCode, customerPhone)) { setShowError("phone"); return false; }
      if (!isValidOptionalEmail(customerEmail)) { setShowError("email"); return false; }
      return true;
    }
    if (!customerName.trim() || customerName.trim().length < 2) { setShowError("name"); return false; }
    if (!isValidCustomerPhone(phoneDialCode, customerPhone)) { setShowError("phone"); return false; }
    if (!isValidOptionalEmail(customerEmail)) { setShowError("email"); return false; }
    if (orderType === "delivery") {
      if (!deliveryAddress.trim()) { setShowError("address"); return false; }
      if (!deliveryNumber.trim()) { setShowError("number"); return false; }
      if (!deliveryPostalCode.trim()) { setShowError("postal"); return false; }
      if (!deliveryCity.trim()) { setShowError("city"); return false; }
      if (!deliveryQuote.zoneMatched) { setShowError("zone"); return false; }
      if (deliveryQuote.belowMinimum) { setShowError("minOrder"); return false; }
    }
    setShowError(null);
    return true;
  };

  const handleContinueToPayment = () => {
    if (!validateDetailsStep()) return;
    setCheckoutStep("payment");
  };

  const validate = (methodOverride?: PaymentMethodId) => {
    if (!validateDetailsStep()) return false;
    if (checkoutMethods.length === 0) { setShowError("method"); return false; }
    const method = methodOverride ?? selected;
    if (!method) { setShowError("method"); return false; }
    if (prepaymentRequired && method !== "card" && method !== "bizum") {
      setShowError("method");
      return false;
    }
    if (isOnlineCheckoutMethod(method) && !stripePublishableKey) {
      setPaymentError(stripeIssue || "Pagamento online indisponível neste momento.");
      setShowError("method");
      return false;
    }
    setShowError(null);
    setPaymentError(null);
    return true;
  };

  const notesParts: string[] = [];
  if (orderType === "delivery" && deliveryFee > 0) {
    notesParts.push(`Taxa entrega: ${deliveryFee.toFixed(2)}€${deliveryQuote.zone ? ` (${deliveryQuote.zone.name})` : ""}`);
  }
  if (couponDiscount > 0) {
    notesParts.push(`Desconto cupón ${couponCode}: -${couponDiscount.toFixed(2)}€`);
  }
  const notes = notesParts.length ? notesParts.join(" | ") : null;

  const deliveryComplementText =
    orderType === "delivery"
      ? formatDeliveryComplement(deliveryFloor, deliveryDoor, deliveryBlock, {
          floor: t("addressFloor"),
          door: t("addressDoor"),
          block: t("addressBlock"),
        })
      : "";

  const deliveryFullAddress =
    orderType === "delivery"
      ? `${deliveryAddress.trim()}${deliveryNumber.trim() ? ` ${deliveryNumber.trim()}` : ""}${deliveryComplementText ? `, ${deliveryComplementText}` : ""}${deliveryCity.trim() ? `, ${deliveryCity.trim()}` : ""}${deliveryPostalCode.trim() ? ` ${deliveryPostalCode.trim()}` : ""}`
      : null;

  const enqueueCheckoutPrint = async (
    result: { order_id: string; order_number: string },
    printOpts: { paymentMethod: string; paymentStatus: "pending" | "paid"; paidViaApp?: boolean },
  ) => {
    await tryPrintCheckoutOrder({
      storeId,
      orderId: result.order_id,
      orderNumber: result.order_number,
      orderType: orderTypeDb,
      tableNumber: mesaValidated ? tableNumber.trim() || null : null,
      customerName: customerName.trim() || null,
      customerPhone: fullCustomerPhone || null,
      customerEmail: normalizeOptionalEmail(customerEmail),
      paymentMethod: printOpts.paymentMethod,
      paymentStatus: printOpts.paymentStatus,
      paidViaApp: printOpts.paidViaApp ?? printOpts.paymentStatus === "paid",
      items,
      total: grandTotal,
      subtotal: totalPrice,
      notes,
      deliveryAddress: deliveryFullAddress,
      customerOrderType: orderType || "takeaway",
      mesaValidated,
      settings,
      companyName: brandingCtx?.settings?.company_name || "Restaurante",
    });
  };

  const assertStoreReady = (): boolean => {
    if (storeLoading || !storeId) {
      setShowError("store");
      return false;
    }
    if (isEmergencyFallbackStoreId(storeId)) {
      setShowError("store");
      return false;
    }
    return true;
  };

  const finishOrder = async (opts: {
    paymentMethod: PaymentMethodId;
    paymentStatus: "pending" | "paid";
    stripePi?: string | null;
  }) => {
    if (!assertStoreReady()) return;

    if (isTableOrder && !mesaValidated) {
      setShowError("table");
      return;
    }

    const paymentMethodDb =
      opts.paymentMethod === "apple" ? "apple_pay"
        : opts.paymentMethod === "google" ? "google_pay"
          : opts.paymentMethod === "counter" || opts.paymentMethod === "link" ? null
            : opts.paymentMethod;

    const fin = opts.paymentMethod === "card" ? cardOrderFinancials() : null;

    const result = await createCustomerOrder({
      storeId,
      orderType: orderTypeDb,
      items,
      subtotal: totalPrice,
      total: grandTotal,
      tableNumber: mesaValidated ? tableNumber.trim() || null : null,
      tableId: mesaValidated ? mesaTableId : null,
      qrToken: mesaValidated ? loadSavedMesaToken() : null,
      customerName: customerName.trim() || null,
      customerPhone: fullCustomerPhone || null,
      customerEmail: normalizeOptionalEmail(customerEmail),
      notes,
      paymentMethod: paymentMethodDb,
      paymentStatus: opts.paymentStatus,
      stripePaymentIntentId: opts.stripePi || null,
      deliveryStreet: orderType === "delivery" ? deliveryAddress.trim() : null,
      deliveryNumber: orderType === "delivery" ? deliveryNumber.trim() : null,
      deliveryComplement: orderType === "delivery" ? deliveryComplementText || null : null,
      deliveryPostalCode: orderType === "delivery" ? deliveryPostalCode.trim() : null,
      deliveryCity: orderType === "delivery" ? deliveryCity.trim() : null,
      deliveryNotes: orderType === "delivery" ? deliveryNotes.trim() : null,
      deliveryFee,
      deliveryZoneId: deliveryQuote.zone?.id || null,
      deliveryZoneName: deliveryQuote.zone?.name || null,
      couponCode: couponId || isDemoVisitCoupon ? couponCode.trim() : null,
      discountAmount: couponDiscount,
      couponId,
      onlineServiceFeeCents: fin?.onlineServiceFeeCents,
      platformFeeCents: fin?.platformFeeCents,
      stripeFeeCents: fin?.stripeFeeCents,
      netToStoreCents: fin?.netToStoreCents,
      stripeConnectAccountId: fin?.stripeConnectAccountId,
    });

    setPaymentMethod(opts.paymentMethod);
    setOrderPaymentStatus(opts.paymentStatus);
    setOrderNumber(result.order_number);
    setActiveOrderId(result.order_id);
    setTrackingOrderId(result.order_id);
    void supabase
      .from("orders")
      .update({ order_locale: lang })
      .eq("id", result.order_id);
    const awaitsCounterPayment =
      (opts.paymentMethod === "cash" || opts.paymentMethod === "counter") && opts.paymentStatus !== "paid";
    syncActiveOrderUrl(result.order_id, awaitsCounterPayment ? "cashPending" : "confirmation");

    if (customerName.trim()) saveSavedCustomerName(customerName.trim());
    if (customerPhone.trim()) saveSavedCustomerPhone(phoneDialCode, customerPhone.trim());
    if (customerEmail.trim()) saveSavedCustomerEmail(customerEmail);
    if (orderType === "delivery") {
      saveSavedDeliveryAddress({
        street: deliveryAddress.trim(),
        number: deliveryNumber.trim(),
        floor: deliveryFloor.trim(),
        door: deliveryDoor.trim(),
        block: deliveryBlock.trim(),
        postalCode: deliveryPostalCode.trim(),
        city: deliveryCity.trim(),
        notes: deliveryNotes.trim(),
      });
    }
    appendLocalOrderHistory({
      id: result.order_id,
      orderNumber: result.order_number,
      storeId,
      total: grandTotal,
      orderType: orderTypeDb,
      status: "pending",
      createdAt: new Date().toISOString(),
      itemCount: items.length,
    });

    await enableCustomerOrderAlerts();
    void subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: fullCustomerPhone || undefined,
    }).catch(() => undefined);

    const printOk = shouldPrintAfterCheckout(
      orderType || "takeaway",
      opts.paymentStatus,
      settings,
      mesaValidated,
    );

    clearCart();
    void trackMarketingEvent("order_completed", { storeId, customerPhone: fullCustomerPhone });
    if (awaitsCounterPayment) {
      setScreen("cashPending");
    } else {
      setScreen("confirmation");
    }

    if (isDemoVisitCoupon) {
      try {
        await finalizeDemoVisitOrder(result.order_id);
        await printVisitDemoOrder({
          storeId,
          orderId: result.order_id,
          orderNumber: result.order_number,
          orderType: orderTypeDb,
          tableNumber: mesaValidated ? tableNumber.trim() || null : null,
          customerName: customerName.trim() || null,
          customerPhone: fullCustomerPhone || null,
          customerEmail: normalizeOptionalEmail(customerEmail),
          paymentMethod: "counter",
          paymentStatus: "paid",
          paidViaApp: true,
          items,
          total: 0,
          subtotal: totalPrice,
          notes,
          deliveryAddress: deliveryFullAddress,
          customerOrderType: orderType || "takeaway",
          mesaValidated,
          settings,
          companyName: brandingCtx?.settings?.company_name || "Restaurante",
        });
      } catch (printErr) {
        console.warn("[checkout] demo visita impressão:", printErr);
      }
    } else if (printOk) {
      void enqueueCheckoutPrint(result, {
        paymentMethod: opts.paymentMethod,
        paymentStatus: opts.paymentStatus,
        paidViaApp: opts.paymentStatus === "paid",
      }).catch((printErr) => {
        console.warn("[checkout] impressão falhou após pedido em dinheiro:", printErr);
      });
    }

    return result;
  };

  const reserveStripeOrderInBackground = (
    pi: Awaited<ReturnType<typeof createStripePaymentIntent>>,
    paymentMethodType: "card" | "bizum",
  ) => {
    void (async () => {
      try {
        const pendingOrder = await createPendingCardOrder(pi.paymentIntentId, {
          onlineServiceFeeCents: pi.onlineServiceFeeCents,
          platformFeeCents: pi.platformFeeCents,
          stripeFeeCents: pi.estimatedStripeFeeCents,
          netToStoreCents: pi.restaurantPortionCents,
          stripeConnectAccountId: pi.stripeConnectAccountId,
        }, paymentMethodType);
        if (!pendingOrder) return;

        try {
          await attachStripeOrderToPaymentIntent({
            storeId,
            paymentIntentId: pi.paymentIntentId,
            orderId: pendingOrder.order_id,
            orderNumber: pendingOrder.order_number,
          });
        } catch (attachErr) {
          console.warn("[checkout] attach order metadata falhou (webhook usa payment_intent_id):", attachErr);
        }

        saveStripeCheckoutSession({
          storeId,
          paymentIntentId: pi.paymentIntentId,
          orderId: pendingOrder.order_id,
          orderNumber: pendingOrder.order_number,
          checkoutMethod: paymentMethodType,
          amountCents: pi.amountCents,
          restaurantPortionCents: pi.restaurantPortionCents,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[checkout] reserva do pedido antes do pagamento falhou:", err);
        setPaymentError(
          err instanceof Error
            ? err.message
            : "Não foi possível reservar o pedido antes do pagamento.",
        );
      }
    })();
  };

  const startStripePayment = async (paymentMethodType: "card" | "bizum") => {
    if (!assertStoreReady()) return;
    setStripeCheckoutPreparing(true);
    try {
      const subtotalCents = Math.round(totalPrice * 100);
      const deliveryCents = Math.round(deliveryFee * 100);
      const discountCents = Math.round(couponDiscount * 100);
      const prefetchKey = buildStripePrefetchKey(paymentMethodType);
      const cached =
        stripePrefetchRef.current?.key === prefetchKey &&
        stripePrefetchRef.current.method === paymentMethodType
          ? stripePrefetchRef.current.promise
          : null;
      stripePrefetchRef.current = null;

      if (paymentMethodType === "bizum") {
        await enableStoreBizumPayments(storeId).catch(() => null);
      }

      const pi = cached
        ? await cached
        : await createStripePaymentIntent({
            storeId,
            subtotalCents,
            deliveryCents,
            discountCents,
            orderType: orderTypeDb,
            paymentMethodType,
            customerEmail: normalizeOptionalEmail(customerEmail) ?? undefined,
          });

      setStripePaymentIntentId(pi.paymentIntentId);
      setStripePaymentMeta({
        amountCents: pi.amountCents,
        restaurantPortionCents: pi.restaurantPortionCents,
        onlineServiceFeeCents: pi.onlineServiceFeeCents,
        platformFeeCents: pi.platformFeeCents,
        estimatedStripeFeeCents: pi.estimatedStripeFeeCents,
        stripeConnectAccountId: pi.stripeConnectAccountId,
        connectEnvironment: pi.connectEnvironment ?? stripeConnectEnvironment,
        publishableKey: pi.publishableKey ?? null,
        checkoutPaymentMethod: pi.checkoutPaymentMethod ?? paymentMethodType,
        paymentMethodTypes: pi.paymentMethodTypes,
      });
      if (pi.connectEnvironment) {
        setStripeConnectEnvironment(pi.connectEnvironment);
      }
      setStripeCheckoutMethod(paymentMethodType);
      setStripeClientSecret(pi.clientSecret);
      if (pi.publishableKey) {
        preloadStripeCheckout(pi.connectEnvironment ?? stripeConnectEnvironment, pi.publishableKey, stripeLocale);
      }

      reserveStripeOrderInBackground(pi, paymentMethodType);
    } finally {
      setStripeCheckoutPreparing(false);
    }
  };

  const showCardOrderConfirmation = async (result: { order_id: string; order_number: string }) => {
    setPaymentMethod(stripeCheckoutMethod);
    setOrderNumber(result.order_number);
    setActiveOrderId(result.order_id);
    setTrackingOrderId(result.order_id);
    syncActiveOrderUrl(result.order_id, "confirmation");

    if (customerName.trim()) saveSavedCustomerName(customerName.trim());
    if (customerPhone.trim()) saveSavedCustomerPhone(phoneDialCode, customerPhone.trim());
    if (customerEmail.trim()) saveSavedCustomerEmail(customerEmail);

    appendLocalOrderHistory({
      id: result.order_id,
      orderNumber: result.order_number,
      storeId,
      total: grandTotal,
      orderType: orderTypeDb,
      status: "pending",
      createdAt: new Date().toISOString(),
      itemCount: items.length,
    });

    await enableCustomerOrderAlerts();
    void subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: fullCustomerPhone || undefined,
    }).catch(() => undefined);

    clearCart();
    clearStripeCheckoutSession();
    setScreen("confirmation");
  };

  const completeStripeCheckout = async (
    createdOrder: { order_id: string; order_number: string },
    paymentIntentId: string,
    checkoutMethod: "card" | "bizum",
  ) => {
    setRecoveringCheckout(true);
    const confirmed = await waitForOrderPaymentConfirmed(createdOrder.order_id, {
      storeId,
      paymentIntentId,
    });
    const orderRef = {
      order_id: confirmed.orderId,
      order_number: confirmed.orderNumber || createdOrder.order_number,
    };

    setOrderPaymentStatus("paid");
    await showCardOrderConfirmation(orderRef);
    setStripeClientSecret(null);
    setStripePaymentIntentId(null);
    setStripePaymentMeta(null);
    setStripePreparedOrder(null);
    setProcessing(false);
    setStripePaymentLocked(false);
    setRecoveringCheckout(false);

    try {
      await enqueueCheckoutPrint(orderRef, {
        paymentMethod: checkoutMethod,
        paymentStatus: "paid",
        paidViaApp: true,
      });
    } catch (printErr) {
      console.warn("[checkout] impressão falhou:", printErr);
    }
  };

  useEffect(() => {
    if (!storeId || stripeClientSecret || recoveringCheckout || stripeCheckoutPreparing || processing) return;
    if (isCounterCashMethod(selectedMethodRef.current ?? selected)) return;

    const session = loadStripeCheckoutSession();
    if (!session || session.storeId !== storeId) return;

    const redirect = readStripeRedirectFromUrl();
    const sessionAgeMs = Date.now() - new Date(session.createdAt).getTime();
    const hasRedirectReturn = Boolean(redirect.paymentIntentId || redirect.clientSecret);
    if (!hasRedirectReturn && sessionAgeMs < 8000) return;

    let cancelled = false;
    setRecoveringCheckout(true);
    setProcessing(true);
    setStripePaymentIntentId(session.paymentIntentId);
    setStripePreparedOrder({ order_id: session.orderId, order_number: session.orderNumber });
    setStripeCheckoutMethod(session.checkoutMethod);

    void (async () => {
      try {
        if (cancelled) return;
        await completeStripeCheckout(
          { order_id: session.orderId, order_number: session.orderNumber },
          session.paymentIntentId,
          session.checkoutMethod,
        );
      } catch (e) {
        if (!cancelled) {
          console.warn("[checkout] recuperação após Bizum falhou:", e);
          const msg = e instanceof Error ? e.message : String(e);
          const notPaidYet =
            msg.toLowerCase().includes("não confirmado") ||
            msg.toLowerCase().includes("not confirmed") ||
            msg.includes("402");
          if (!notPaidYet) clearStripeCheckoutSession();
          setRecoveringCheckout(false);
          setProcessing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, stripeClientSecret, recoveringCheckout, stripeCheckoutPreparing, processing, selected]);

  const createPendingCardOrder = async (
    paymentIntentIdOverride?: string,
    finOverride?: ReturnType<typeof cardOrderFinancials>,
    paymentMethodOverride?: "card" | "bizum",
  ) => {
    if (!assertStoreReady()) return undefined;
    const paymentIntentId = paymentIntentIdOverride ?? stripePaymentIntentId;
    if (!paymentIntentId) throw new Error("Pagamento não iniciado");
    if (stripePreparedOrder) return stripePreparedOrder;

    const fin = finOverride ?? cardOrderFinancials();
    const result = await createCustomerOrder({
      storeId,
      orderType: orderTypeDb,
      items,
      subtotal: totalPrice,
      total: grandTotal,
      tableNumber: mesaValidated ? tableNumber.trim() || null : null,
      tableId: mesaValidated ? mesaTableId : null,
      qrToken: mesaValidated ? loadSavedMesaToken() : null,
      customerName: customerName.trim() || null,
      customerPhone: fullCustomerPhone || null,
      customerEmail: normalizeOptionalEmail(customerEmail),
      notes,
      paymentMethod: paymentMethodOverride ?? stripeCheckoutMethod,
      paymentStatus: "pending",
      stripePaymentIntentId: paymentIntentId,
      deliveryStreet: orderType === "delivery" ? deliveryAddress.trim() : null,
      deliveryNumber: orderType === "delivery" ? deliveryNumber.trim() : null,
      deliveryComplement: orderType === "delivery" ? deliveryComplementText || null : null,
      deliveryPostalCode: orderType === "delivery" ? deliveryPostalCode.trim() : null,
      deliveryCity: orderType === "delivery" ? deliveryCity.trim() : null,
      deliveryNotes: orderType === "delivery" ? deliveryNotes.trim() : null,
      deliveryFee,
      deliveryZoneId: deliveryQuote.zone?.id || null,
      deliveryZoneName: deliveryQuote.zone?.name || null,
      couponCode: couponId ? couponCode.trim() : null,
      discountAmount: couponDiscount,
      couponId,
      onlineServiceFeeCents: fin.onlineServiceFeeCents,
      platformFeeCents: fin.platformFeeCents,
      stripeFeeCents: fin.stripeFeeCents,
      netToStoreCents: fin.netToStoreCents,
      stripeConnectAccountId: fin.stripeConnectAccountId,
    });
    setStripePreparedOrder(result);
    return result;
  };

  const handlePayClick = () => {
    if (processing || stripeClientSecret) return;
    if (isDemoVisitCoupon && grandTotal <= 0.01) {
      setProcessing(true);
      setPaymentError(null);
      void finishOrder({ paymentMethod: "counter", paymentStatus: "paid" })
        .catch((e) => {
          console.error("[checkout] demo visita:", e);
          setPaymentError(e instanceof Error ? e.message : "Não foi possível enviar a demonstração.");
          setShowError("method");
        })
        .finally(() => setProcessing(false));
      return;
    }
    if (!checkoutMethods.length) {
      setShowError("method");
      return;
    }
    const method = selectedMethodRef.current ?? selected ?? checkoutMethods[0]?.id ?? null;
    if (!method) {
      setShowError("method");
      setPaymentError(t("checkoutPickPayment"));
      return;
    }
    if (!selected) setSelected(method);
    void confirm(method);
  };

  const confirm = async (methodOverride?: PaymentMethodId) => {
    const method = methodOverride ?? selectedMethodRef.current ?? selected;
    if (processing || !method || !validate(method)) return;

    if (!openStatus.open) {
      setClosedDialog(true);
      return;
    }

    if (isOnlineCheckoutMethod(method)) {
      if (!stripePublishableKey) {
        setPaymentError(stripeIssue || "Pagamento online indisponível neste momento.");
        setShowError("method");
        return;
      }
      setProcessing(true);
      setPaymentError(null);
      try {
        await startStripePayment(method);
      } catch (e) {
        console.error(e);
        setPaymentError(
          e instanceof Error
            ? e.message
            : method === "bizum"
              ? "Não foi possível abrir o pagamento Bizum."
              : "Não foi possível abrir o pagamento com cartão.",
        );
        setShowError("method");
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (prepaymentRequired) {
      setShowError("method");
      return;
    }

    clearStripeCheckoutSession();
    setProcessing(true);
    setPaymentError(null);
    try {
      await finishOrder({
        paymentMethod: method,
        paymentStatus: "pending",
      });
    } catch (e) {
      console.error("[checkout] pedido em dinheiro falhou:", e);
      setPaymentError(
        e instanceof Error ? e.message : "Não foi possível enviar o pedido. Tente novamente.",
      );
      setShowError("method");
    } finally {
      setProcessing(false);
    }
  };

  const compact = isTableOrder;
  const activeCheckoutMethod = selectedMethodRef.current ?? selected;
  const showCheckoutSpinner =
    !stripeClientSecret &&
    (stripeCheckoutPreparing ||
      recoveringCheckout ||
      (processing &&
        (isOnlineCheckoutMethod(activeCheckoutMethod) || isCounterCashMethod(activeCheckoutMethod))));

  if (sellerMode.active) {
    return <SellerCheckoutForm />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary/20 animate-fade-in">


      <StoreClosedDialog
        open={closedDialog}
        status={openStatus}
        channel={channel}
        onKeep={() => {
          setClosedDialog(false);
          setScreen("review");
        }}
      />
      <ScreenHeader
        eyebrow={checkoutStep === "details" && !isTableOrder ? "Etapa 1 de 2" : t("finalStep")}
        title={isTableOrder ? "Pagamento na mesa" : checkoutStep === "details" ? "Os teus dados" : t("pay")}
        onBack={() => {
          if (stripePaymentLocked || processing || recoveringCheckout) return;
          if (stripeClientSecret) {
            resetStripeCheckoutState();
            return;
          }
          if (checkoutStep === "payment" && !isTableOrder) {
            setCheckoutStep("details");
          } else {
            setScreen("review");
          }
        }}
        sticky
      />

      <div className={`relative z-0 flex-1 overflow-y-auto overscroll-contain ${compact ? "px-3 pb-4" : "px-4 pb-4"}`}>
        <div className={`flex flex-col ${compact ? "pt-3 gap-3" : "pt-5 gap-4"}`}>
        {(isTableOrder || checkoutStep === "payment") && (
        <div className={`relative bg-card border border-border shadow-card overflow-hidden ${compact ? "rounded-2xl p-4" : "rounded-[28px] p-6"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t("totalToPay")}</p>
              <p className={`font-black text-price tabular-nums tracking-tight ${compact ? "text-3xl mt-0.5" : "text-[44px] leading-none mt-1.5"}`}>
                {grandTotal.toFixed(2)}€
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {items.length} {items.length === 1 ? t("oneItem") : t("items")}
              </p>
            </div>
            {isTableOrder && tableNumber ? (
              <div className="shrink-0 text-center bg-primary/10 rounded-xl px-3 py-2">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Mesa</p>
                <p className="text-xl font-black text-primary">{tableNumber}</p>
              </div>
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-11 h-11 object-contain rounded-lg bg-secondary/50 p-1 shrink-0" />
            ) : null}
          </div>
        </div>
        )}

        {/* Resumo subtotal removido, já mostrado na tela de revisão */}
        {hiddenCheckoutFeature("subtotal-summary") && !stripeClientSecret && (
          <div className={`mt-3 bg-card rounded-2xl border border-border/80 ${compact ? "p-3 space-y-1.5 text-xs" : "p-4 space-y-2 text-sm"}`}>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">{totalPrice.toFixed(2)}€</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Entrega</span>
                <span className="font-semibold tabular-nums">{deliveryFee.toFixed(2)}€</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between gap-2 text-green-700 dark:text-green-400">
                <span>Desconto</span>
                <span className="font-semibold tabular-nums">−{couponDiscount.toFixed(2)}€</span>
              </div>
            )}
          </div>
        )}

        {stripeClientSecret ? (
          <div className={`mt-3 bg-card rounded-2xl border border-border shadow-card ${compact ? "p-3" : "p-4 mt-5 rounded-[24px]"}`}>
            <p className="text-sm font-black text-foreground mb-2">
              {stripeCheckoutMethod === "bizum" ? t("stripePayBizum") : t("stripePayCard")}
            </p>
            <StripePaymentForm
              compact={compact}
              clientSecret={stripeClientSecret}
              amountLabel={`${grandTotal.toFixed(2)}€`}
              checkoutMethod={stripeCheckoutMethod}
              paymentMethodTypes={stripePaymentMeta?.paymentMethodTypes}
              connectEnvironment={stripePaymentMeta?.connectEnvironment ?? stripeConnectEnvironment}
              publishableKey={stripePaymentMeta?.publishableKey ?? null}
              locale={stripeLocale}
              copy={stripeFormCopy}
              defaultDialCode={phoneDialCode}
              defaultLocalPhone={customerPhone}
              onBusyChange={setStripePaymentLocked}
              onCancel={() => {
                if (stripePaymentLocked || processing) return;
                resetStripeCheckoutState();
              }}
              onSuccess={async () => {
                console.log("[checkout] Stripe payment succeeded, confirmando pedido…");
                if (!assertStoreReady()) {
                  console.error("[checkout] Loja indisponível após pagamento aprovado");
                  window.alert(
                    "Pagamento aprovado, mas a loja ficou indisponível. O pedido já foi reservado, contacte o restaurante com o seu telefone.",
                  );
                  return;
                }
                setProcessing(true);
                const paymentIntentId = stripePaymentIntentId;
                if (!paymentIntentId) throw new Error("Pagamento não iniciado");

                let createdOrder: { order_id: string; order_number: string } | null = stripePreparedOrder;
                try {
                  if (!createdOrder) {
                    createdOrder = (await createPendingCardOrder(paymentIntentId)) ?? null;
                  }
                  if (!createdOrder) throw new Error("Pedido não retornou ID");

                  console.log("[checkout] Pedido confirmado:", createdOrder.order_number);
                  await completeStripeCheckout(createdOrder, paymentIntentId, stripeCheckoutMethod);
                } catch (orderErr) {
                  console.error("[checkout] Falha ao confirmar pedido após pagamento aprovado:", orderErr);
                  setProcessing(false);
                  setStripePaymentLocked(false);
                  const msg = orderErr instanceof Error ? orderErr.message : "erro desconhecido";
                  const session = loadStripeCheckoutSession();
                  window.alert(
                    `Pagamento aprovado (${paymentIntentId}), pedido ${session?.orderNumber ?? "reservado"}. ` +
                      `Se não vir a confirmação, não pague de novo, mostre esta mensagem ao restaurante: ${msg}`,
                  );
                }
              }}
            />
          </div>
        ) : showCheckoutSpinner ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-9 h-9 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* "Datos guardados" hint removido a pedido, perfil é usado em background */}
            {hiddenCheckoutFeature("saved-profile-hint") && hasCustomerProfile() && (
              <p className="mt-3 text-[11px] text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                {t("savedProfileHint")}
              </p>
            )}

            {isTableOrder && mesaValidated && (
              <div className={`mt-3 bg-card rounded-2xl border border-border overflow-hidden ${showError === "phone" ? "ring-2 ring-destructive/40" : ""}`}>
                <div className={`px-3 py-2.5 ${showError === "phone" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <Phone className="w-3 h-3 text-primary" />
                    {t("yourPhone")} <span className="text-destructive">*</span>
                  </label>
                  <PhoneInput
                    dialCode={phoneDialCode}
                    onDialCodeChange={(code) => {
                      setPhoneDialCode(code);
                      if (showError === "phone") setShowError(null);
                    }}
                    localNumber={customerPhone}
                    onLocalNumberChange={(value) => {
                      setCustomerPhone(value);
                      if (showError === "phone") setShowError(null);
                    }}
                    error={showError === "phone"}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{t("phoneOrderHint")}</p>
                </div>
                <CustomerEmailField
                  value={customerEmail}
                  onChange={setCustomerEmail}
                  showError={showError === "email"}
                  onClearError={() => setShowError(null)}
                  className="border-t-0"
                />
              </div>
            )}

            {orderType === "takeaway" && checkoutStep === "details" && (
              <div className={`mt-3 bg-card rounded-2xl border border-border overflow-hidden ${showError === "name" || showError === "phone" ? "ring-2 ring-destructive/40" : ""}`}>
                <div className={`px-3 py-2.5 ${showError === "name" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <User className="w-3 h-3 text-primary" />
                    {t("yourName")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value.slice(0, 40));
                      if (showError === "name") setShowError(null);
                    }}
                    className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent focus:border-primary"
                  />
                </div>
                <div className={`px-3 py-2.5 border-t border-border ${showError === "phone" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <Phone className="w-3 h-3 text-primary" />
                    {t("yourPhone")} <span className="text-destructive">*</span>
                  </label>
                  <PhoneInput
                    dialCode={phoneDialCode}
                    onDialCodeChange={(code) => {
                      setPhoneDialCode(code);
                      if (showError === "phone") setShowError(null);
                    }}
                    localNumber={customerPhone}
                    onLocalNumberChange={(value) => {
                      setCustomerPhone(value);
                      if (showError === "phone") setShowError(null);
                    }}
                    error={showError === "phone"}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{t("phoneOrderHint")}</p>
                </div>
                <CustomerEmailField
                  value={customerEmail}
                  onChange={setCustomerEmail}
                  showError={showError === "email"}
                  onClearError={() => setShowError(null)}
                />
              </div>
            )}

            {orderType === "delivery" && checkoutStep === "details" && (
              <div className={`mt-3 space-y-0 bg-card rounded-2xl border border-border overflow-hidden ${showError === "name" || showError === "phone" || showError === "address" ? "ring-2 ring-destructive/40" : ""}`}>
                <div className={`px-3 py-2.5 ${showError === "name" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <User className="w-3 h-3 text-primary" />
                    {t("yourName")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value.slice(0, 40));
                      if (showError === "name") setShowError(null);
                    }}
                    className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent focus:border-primary"
                  />
                </div>
                <div className={`px-3 py-2.5 border-t border-border ${showError === "phone" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <Phone className="w-3 h-3 text-primary" />
                    {t("yourPhone")} <span className="text-destructive">*</span>
                  </label>
                  <PhoneInput
                    dialCode={phoneDialCode}
                    onDialCodeChange={(code) => {
                      setPhoneDialCode(code);
                      if (showError === "phone") setShowError(null);
                    }}
                    localNumber={customerPhone}
                    onLocalNumberChange={(value) => {
                      setCustomerPhone(value);
                      if (showError === "phone") setShowError(null);
                    }}
                    error={showError === "phone"}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{t("phoneOrderHint")}</p>
                </div>
                <CustomerEmailField
                  value={customerEmail}
                  onChange={setCustomerEmail}
                  showError={showError === "email"}
                  onClearError={() => setShowError(null)}
                />
                <div className="px-3 py-3 border-t border-border space-y-2">
                  <UseMyLocationButton
                    onCoords={(coords) => {
                      if (storeCoords) {
                        setCustomerDistanceKm(distanceKm(storeCoords, coords));
                      }
                    }}
                  />
                  <div className={showError === "address" ? "ring-2 ring-destructive/40 rounded-xl p-1" : ""}>
                    <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      {t("addressStreet")} *
                    </label>
                    <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value.slice(0, 120))} className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value.slice(0, 10))} placeholder={`${t("addressNumber")} *`} className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent" />
                    <input type="text" value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={`${t("addressPostal")} *`} className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t("addressFloorDoorHint")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                        {t("addressFloor")}
                      </label>
                      <input
                        type="text"
                        value={deliveryFloor}
                        onChange={(e) => setDeliveryFloor(e.target.value.slice(0, 20))}
                        placeholder={t("addressFloorPh")}
                        className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                        {t("addressDoor")}
                      </label>
                      <input
                        type="text"
                        value={deliveryDoor}
                        onChange={(e) => setDeliveryDoor(e.target.value.slice(0, 20))}
                        placeholder={t("addressDoorPh")}
                        className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                        {t("addressBlock")}
                      </label>
                      <input
                        type="text"
                        value={deliveryBlock}
                        onChange={(e) => setDeliveryBlock(e.target.value.slice(0, 20))}
                        placeholder={t("addressBlockPh")}
                        className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value.slice(0, 60)); if (showError === "city" || showError === "minOrder") setShowError(null); }}
                    placeholder={t("addressCity")}
                    className={`w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 ${showError === "city" ? "border-destructive/60" : "border-transparent"}`}
                  />
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                      Observações para entrega
                    </label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value.slice(0, 300))}
                      placeholder="Ex: tocar campainha, deixar na portaria, referência..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm font-medium bg-secondary/60 rounded-xl border-2 border-transparent focus:border-primary resize-none"
                    />
                  </div>
                  {showError === "minOrder" && deliveryQuote.minOrder > 0 && (
                    <p className="text-xs text-destructive font-bold">Pedido mínimo: {deliveryQuote.minOrder.toFixed(2)}€</p>
                  )}
                </div>
              </div>
            )}

            {checkoutStep === "details" && !isTableOrder && (
              <div className="mt-3 bg-card rounded-2xl border border-border p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
                  {t("couponLabel") || "Cupão / Cupón"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="CÓDIGO"
                    className="flex-1 h-10 px-3 rounded-xl border border-border font-bold uppercase text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    className="px-4 h-10 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs shadow-primary"
                  >
                    {t("couponApply") || "Aplicar"}
                  </button>
                </div>
                {couponError && <p className="text-xs text-destructive mt-1.5 font-medium">{couponError}</p>}
                {couponDiscount > 0 && (
                  <p className="text-xs text-success mt-1.5 font-bold">
                    −{couponDiscount.toFixed(2)}€ {t("couponApplied") || "desconto aplicado"}
                  </p>
                )}
                {isDemoVisitCoupon && (
                  <p className="text-xs text-primary mt-2 font-medium">
                    Modo demonstração: sem pagamento, impressão no Mac de visita.
                  </p>
                )}
              </div>
            )}

            {/* Aviso "Pagamentos online não activos" oculto, não bloqueia checkout (fallback automático para dinheiro/balcão) */}
            {hiddenCheckoutFeature("stripe-warning") && stripeIssue && prepaymentRequired && (
              <div className="mt-3 flex gap-2 items-start rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{stripeIssue}</p>
              </div>
            )}

            {(isTableOrder || checkoutStep === "payment") && checkoutMethods.length === 0 && !settingsLoading && (
              <div className="mt-3 flex gap-2 items-start rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {prepaymentRequired
                    ? "Pagamento online obrigatório, active os recebimentos ou peça ajuda à equipa."
                    : "Nenhum método de pagamento disponível para este tipo de pedido."}
                </p>
              </div>
            )}

            {settingsLoading ? (
              <div className="mt-3 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (isTableOrder || checkoutStep === "payment") && checkoutMethods.length > 0 && (
              <div className={`mt-3 ${showError === "method" ? "ring-2 ring-destructive/40 rounded-2xl p-0.5" : ""}`}>
                <p className="text-[10px] font-bold uppercase text-muted-foreground px-1 mb-1.5">
                  {isTableOrder ? "Forma de pagamento *" : t("pickMethod")}
                </p>
                <div className="flex flex-col gap-1.5">
                  {checkoutMethods.map((pm) => {
                    const isSel = selected === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => selectPaymentMethod(pm.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all touch-action-manipulation ${
                          isSel ? "border-success bg-success/5" : "border-border bg-card"
                        }`}
                      >
                        <pm.icon className="w-5 h-5 shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-black text-sm">{tProduct(METHOD_LABELS[pm.id])}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {tProduct(METHOD_SUBS[pm.id])}
                          </p>
                        </div>
                        {isSel && <Check className="w-5 h-5 text-success shrink-0" />}
                      </button>
                    );
                  })}
                  {selected === "card" && stripePublishableKey && (
                    <p className="text-[10px] text-muted-foreground px-1 pt-1">
                      No telemóvel podem aparecer Apple Pay ou Google Pay. No computador use o cartão normal.
                    </p>
                  )}
                  {selected === "bizum" && stripePublishableKey && (
                    <p className="text-[10px] text-muted-foreground px-1 pt-1">
                      Será redireccionado para confirmar o pagamento na app Bizum.
                    </p>
                  )}
                  {/* Aviso amber abaixo de Efectivo removido, confirmação acontece em tela dedicada após finalizar */}
                </div>
                {showError === "method" && (
                  <p className="text-xs text-destructive font-bold mt-1.5 px-1">
                    {paymentError || "Seleccione uma forma de pagamento para continuar."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {!stripeClientSecret && !showCheckoutSpinner && (
        <div className={`shrink-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 ${CUSTOMER_ACTION_FOOTER_PAD_CLASS}`}>
          {showError === "store" && (
            <div className="mb-2 px-1">
              <p className="text-xs text-destructive font-bold">
                {isEmergencyFallbackStoreId(storeId) ? t("errStorePreviewOnly") : t("errStoreNotReady")}
              </p>
              {isEmergencyFallbackStoreId(storeId) && (
                <a
                  href="https://kebabturco.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-primary underline"
                >
                  Abrir site publicado →
                </a>
              )}
            </div>
          )}
          {checkoutStep === "details" && !isTableOrder ? (
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="w-full flex items-center justify-between gap-3 py-3.5 px-4 bg-gradient-cta text-success-foreground rounded-2xl font-black text-base touch-action-manipulation"
            >
              <span>Continuar</span>
              <span className="bg-white/20 rounded-full px-3 py-0.5 tabular-nums text-sm">{grandTotal.toFixed(2)}€</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePayClick}
              disabled={!payButtonReady}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gradient-cta text-success-foreground rounded-2xl font-black text-base disabled:opacity-40 touch-action-manipulation"
            >
              {processing || stripeCheckoutPreparing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="flex-1 text-left">
                    {isDemoVisitCoupon
                      ? "Confirmar demonstração"
                      : isTableOrder
                        ? "Pagar e finalizar"
                        : t("finalizeOrder")}
                  </span>
                  <span className="bg-white/20 rounded-full px-3 py-0.5 tabular-nums text-sm">
                    {isDemoVisitCoupon ? "0,00€" : `${grandTotal.toFixed(2)}€`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
