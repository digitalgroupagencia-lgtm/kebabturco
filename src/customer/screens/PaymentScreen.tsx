import { useEffect, useMemo, useState } from "react";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/customer/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import StripePaymentForm from "@/components/StripePaymentForm";
import {
  createCustomerOrder,
  createStripePaymentIntent,
  fetchStoreFinancialProfile,
  validateCoupon,
  verifyStripePaymentIntent,
  PLATFORM_FEE_CENTS,
} from "@/services/orderService";
import { tryPrintCheckoutOrder } from "@/services/checkoutPrintHelper";
import { inferStripePlatformStatus } from "@/lib/inferStripePlatformStatus";
import {
  loadSavedMesaToken,
  loadSavedOrderType,
  saveSavedCustomerName,
  saveSavedCustomerPhone,
  saveSavedDeliveryAddress,
  hasCustomerProfile,
  formatDeliveryComplement,
} from "@/lib/customerSession";
import { appendLocalOrderHistory } from "@/lib/customerOrderHistory";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { enableCustomerOrderAlerts } from "@/lib/customerOrderAlerts";
import { hasStripePublishableKey, type StripePublishableEnvironment } from "@/lib/stripePublishableKey";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";
import {
  computeRestaurantPortionEur,
  computePlatformDeductionEur,
  PLATFORM_FEE_EUR,
} from "@/lib/processingFee";
import {
  resolveCheckoutMethods,
  requiresPrepayment,
  shouldPrintAfterCheckout,
  stripeConfigIssue,
} from "@/lib/paymentPolicy";
import { syncActiveOrderUrl } from "@/lib/customerOrderUrl";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import PhoneInput from "@/components/PhoneInput";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, User, Hash, Phone, MapPin, Loader2, AlertCircle, Sparkles } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";
import { useStoreOpenStatus } from "@/hooks/useStoreOpenStatus";
import StoreClosedDialog from "@/customer/components/StoreClosedDialog";
import SellerCheckoutForm from "@/customer/components/SellerCheckoutForm";
import { useSellerMode } from "@/contexts/SellerModeContext";



const METHOD_DEFS: { id: PaymentMethodId; icon: typeof CreditCard }[] = [
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
  bizum: { pt: "", en: "", es: "", fr: "" },
  cash: { pt: "Pagamento no caixa", en: "Pay at register", es: "Pago en caja", fr: "Paiement à la caisse" },
  pix: { pt: "Pagamento instantâneo", en: "Instant payment", es: "Pago instantáneo", fr: "Paiement instantané" },
  apple: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  google: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  link: { pt: "Receba um link", en: "Get a link", es: "Recibe un enlace", fr: "Recevoir un lien" },
  counter: { pt: "Pague ao retirar", en: "Pay when picking up", es: "Paga al recoger tu pedido", fr: "Payer au retrait" },
};


const hiddenCheckoutFeature = (_name: string) => false;

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
    mesaTableId,
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
  const { t, tProduct } = useLanguage();
  const logoUrl = brandingCtx?.settings?.logo_main_url ?? null;
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const [processing, setProcessing] = useState(false);
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
  } | null>(null);
  const [stripePreparedOrder, setStripePreparedOrder] = useState<{ order_id: string; order_number: string } | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeConnectEnvironment, setStripeConnectEnvironment] = useState<StripePublishableEnvironment>("live");
  const [showError, setShowError] = useState<null | "name" | "table" | "phone" | "address" | "number" | "postal" | "city" | "method" | "minOrder" | "zone" | "store">(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
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
  const mesaValidated = isTableOrder && mesaLocked && Boolean(mesaTableId);
  const stripePublishableKey = hasStripePublishableKey(stripeConnectEnvironment);
  const prepaymentRequired = orderType ? requiresPrepayment(orderType, settings) : false;
  const stripeIssue =
    stripeConnectEnvironment === "test" && !stripePublishableKey && stripeEnabled
      ? "Pagamento com cartão de teste indisponível — falta a chave publicável de teste (pk_test) no site publicado."
      : stripeConfigIssue(stripeEnabled, stripePublishableKey);

  useEffect(() => {
    if (isTableOrder && !mesaValidated) {
      setScreen("orderType");
    }
  }, [isTableOrder, mesaValidated, setScreen]);
  const fullCustomerPhone = formatFullPhone(phoneDialCode, customerPhone);
  const orderTypeDb = isTableOrder ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway";

  const { quote: deliveryQuote } = useDeliveryFee(
    orderType === "delivery" ? storeId : null,
    deliveryPostalCode,
    deliveryCity,
    totalPrice,
  );
  const deliveryFee = orderType === "delivery" ? deliveryQuote.fee : 0;
  const restaurantPortionEur = computeRestaurantPortionEur(totalPrice, deliveryFee, couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode.trim() || !storeId || isTableOrder) return;
    try {
      const result = await validateCoupon(storeId, couponCode.trim(), totalPrice);
      if (!result.valid) {
        setCouponError(result.error || "Cupón inválido");
        setCouponDiscount(0);
        setCouponId(null);
        return;
      }
      setCouponDiscount(result.discount_amount || 0);
      setCouponId(result.coupon_id || null);
      setCouponError(null);
    } catch {
      setCouponError("Erro ao validar cupón");
    }
  };

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
        setStripeEnabled(isStripeConnectReady(profile));
        const platform = inferStripePlatformStatus(profile);
        const useTest =
          profile?.stripe_connect_environment === "test" ||
          Boolean(profile?.stripe_connect_test_simulated) ||
          (Boolean(platform?.productionBlocked) && hasStripePublishableKey("test"));
        setStripeConnectEnvironment(useTest ? "test" : "live");
      })
      .catch(() => setStripeEnabled(false));
  }, [storeId]);




  const checkoutMethods = useMemo(() => {
    if (!orderType) return [];
    const ids = resolveCheckoutMethods({
      orderType,
      mesaValidated,
      settings,
      stripeReady: stripeEnabled,
      stripePublishableKey,
    });
    // Redsys e Bizum foram removidos da experiência do cliente.
    // Apenas Stripe (card) e Efectivo (cash/counter) ficam visíveis.
    return METHOD_DEFS.filter((m) => ids.includes(m.id));
  }, [orderType, mesaValidated, settings, stripeEnabled, stripePublishableKey]);


  const grandTotal = restaurantPortionEur;

  const cardOrderFinancials = () => {
    const restaurantCents = Math.round(restaurantPortionEur * 100);
    const serviceCents =
      stripePaymentMeta?.onlineServiceFeeCents ??
      Math.round(computePlatformDeductionEur(restaurantPortionEur) * 100);
    return {
      onlineServiceFeeCents: serviceCents,
      platformFeeCents: stripePaymentMeta?.platformFeeCents ?? PLATFORM_FEE_CENTS,
      stripeFeeCents:
        stripePaymentMeta?.estimatedStripeFeeCents ?? Math.max(0, serviceCents - PLATFORM_FEE_CENTS),
      netToStoreCents: stripePaymentMeta?.restaurantPortionCents ?? restaurantCents,
      stripeConnectAccountId: stripePaymentMeta?.stripeConnectAccountId ?? null,
    };
  };

  const tablePayReady = checkoutMethods.length > 0;
  const canFinalize = checkoutMethods.length > 0 && Boolean(selected) && !processing && !stripeClientSecret;

  useEffect(() => {
    if (checkoutMethods.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((current) => {
      if (current && checkoutMethods.some((m) => m.id === current)) {
        return current;
      }
      const cardMethod = checkoutMethods.find((m) => m.id === "card");
      if (cardMethod) return "card";
      if (checkoutMethods.length === 1) return checkoutMethods[0].id;
      return null;
    });
  }, [checkoutMethods]);

  const validateDetailsStep = () => {
    if (!orderType) { setShowError("method"); return false; }
    if (isTableOrder) return true;
    if (!customerName.trim() || customerName.trim().length < 2) { setShowError("name"); return false; }
    if (!isValidCustomerPhone(phoneDialCode, customerPhone)) { setShowError("phone"); return false; }
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

  const validate = () => {
    if (!validateDetailsStep()) return false;
    if (checkoutMethods.length === 0) { setShowError("method"); return false; }
    if (!selected) { setShowError("method"); return false; }
    if (prepaymentRequired && selected !== "card") { setShowError("method"); return false; }
    if (selected === "card" && !stripePublishableKey) { setShowError("method"); return false; }
    setShowError(null);
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
      couponCode: couponId ? couponCode.trim() : null,
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
    const awaitsCounterPayment =
      (opts.paymentMethod === "cash" || opts.paymentMethod === "counter") && opts.paymentStatus !== "paid";
    syncActiveOrderUrl(result.order_id, awaitsCounterPayment ? "cashPending" : "confirmation");

    if (customerName.trim()) saveSavedCustomerName(customerName.trim());
    if (customerPhone.trim()) saveSavedCustomerPhone(phoneDialCode, customerPhone.trim());
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
    await subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: fullCustomerPhone || undefined,
    });

    const printOk = shouldPrintAfterCheckout(
      orderType || "takeaway",
      opts.paymentStatus,
      settings,
      mesaValidated,
    );

    if (printOk) {
      await enqueueCheckoutPrint(result, {
        paymentMethod: opts.paymentMethod,
        paymentStatus: opts.paymentStatus,
        paidViaApp: opts.paymentStatus === "paid",
      });
    }

    clearCart();
    if (awaitsCounterPayment) {
      setScreen("cashPending");
      return result;
    }
    setScreen("confirmation");
    return result;
  };

  const startCardPayment = async () => {
    if (!assertStoreReady()) return;

    const subtotalCents = Math.round(totalPrice * 100);
    const deliveryCents = Math.round(deliveryFee * 100);
    const discountCents = Math.round(couponDiscount * 100);
    const pi = await createStripePaymentIntent({
      storeId,
      subtotalCents,
      deliveryCents,
      discountCents,
      orderType: orderTypeDb,
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
    });
    if (pi.connectEnvironment) {
      setStripeConnectEnvironment(pi.connectEnvironment);
    }
    setStripeClientSecret(pi.clientSecret);
  };

  const verifyCardPaymentWithRetry = async (params: {
    storeId: string;
    paymentIntentId: string;
    orderId: string;
    amountCents: number;
  }) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await verifyStripePaymentIntent(params);
      } catch (e) {
        lastError = e;
        if (attempt < 4) {
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      }
    }
    throw lastError;
  };

  const showCardOrderConfirmation = async (result: { order_id: string; order_number: string }) => {
    setPaymentMethod("card");
    setOrderNumber(result.order_number);
    setActiveOrderId(result.order_id);
    setTrackingOrderId(result.order_id);
    syncActiveOrderUrl(result.order_id, "confirmation");

    await enableCustomerOrderAlerts();
    await subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: fullCustomerPhone || undefined,
    });

    clearCart();
    setScreen("confirmation");
  };

  const createPendingCardOrder = async () => {
    if (!assertStoreReady()) return undefined;
    if (!stripePaymentIntentId) throw new Error("Pagamento não iniciado");
    if (stripePreparedOrder) return stripePreparedOrder;

    const fin = cardOrderFinancials();
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
      notes,
      paymentMethod: "card",
      paymentStatus: "pending",
      stripePaymentIntentId,
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

  const confirm = async () => {
    if (processing || !validate() || !selected) return;

    if (!openStatus.open) {
      setClosedDialog(true);
      return;
    }




    if (selected === "card") {
      if (!stripePublishableKey) {
        setShowError("method");
        return;
      }
      setProcessing(true);
      try {
        await startCardPayment();
      } catch (e) {
        console.error(e);
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

    setProcessing(true);
    try {
      await finishOrder({
        paymentMethod: selected,
        paymentStatus: "pending",
      });
    } finally {
      setProcessing(false);
    }
  };

  const compact = isTableOrder;

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
            {mesaLocked && tableNumber ? (
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

        {/* Resumo subtotal removido — já mostrado na tela de revisão */}
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
            <p className="text-sm font-black text-foreground mb-2">Pagamento com cartão</p>
            <StripePaymentForm
              compact={compact}
              clientSecret={stripeClientSecret}
              amountLabel={`${grandTotal.toFixed(2)}€`}
              connectEnvironment={stripePaymentMeta?.connectEnvironment ?? stripeConnectEnvironment}
              publishableKey={stripePaymentMeta?.publishableKey ?? null}
              onCancel={() => {
                setStripeClientSecret(null);
                setStripePaymentIntentId(null);
                setStripePaymentMeta(null);
                setStripePreparedOrder(null);
              }}
              onSuccess={async () => {
                console.log("[checkout] Stripe payment succeeded — criando pedido…");
                if (!assertStoreReady()) {
                  console.error("[checkout] Loja indisponível após pagamento aprovado");
                  window.alert("Pagamento aprovado pela Stripe, mas a loja ficou indisponível. Anote o código do cartão e contacte o restaurante.");
                  return;
                }
                setProcessing(true);
                let createdOrder: { order_id: string; order_number: string } | null = stripePreparedOrder;
                try {
                  if (!createdOrder) {
                    createdOrder = await createPendingCardOrder() ?? null;
                  }
                  if (!createdOrder) throw new Error("Pedido não retornou ID");

                  console.log("[checkout] Pedido criado:", createdOrder.order_number);
                  setOrderPaymentStatus("paid");
                  await showCardOrderConfirmation(createdOrder);
                } catch (orderErr) {
                  console.error("[checkout] Falha ao criar pedido após pagamento aprovado:", orderErr);
                  setProcessing(false);
                  const msg = orderErr instanceof Error ? orderErr.message : "erro desconhecido";
                  window.alert(
                    `Pagamento aprovado pela Stripe (${stripePaymentIntentId ?? "—"}), mas houve falha ao registar o pedido: ${msg}. ` +
                    `Por favor mostre este código ao restaurante para reembolso ou conclusão manual.`,
                  );
                  return;
                }

                // Pedido criado e tela de confirmação activa — daqui em diante nada bloqueia o cliente.
                setStripeClientSecret(null);
                setProcessing(false);

                // Verificação do servidor + impressão em background (não bloqueia UI).
                void (async () => {
                  try {
                    await verifyCardPaymentWithRetry({
                      storeId,
                      paymentIntentId: stripePaymentIntentId!,
                      orderId: createdOrder!.order_id,
                      amountCents: stripePaymentMeta?.restaurantPortionCents ?? Math.round(grandTotal * 100),
                    });
                  } catch (verifyError) {
                    console.warn("[checkout] verify-payment-intent falhou (webhook irá liquidar):", verifyError);
                  }
                  try {
                    await enqueueCheckoutPrint(createdOrder!, {
                      paymentMethod: "card",
                      paymentStatus: "paid",
                      paidViaApp: true,
                    });
                  } catch (printErr) {
                    console.warn("[checkout] impressão falhou:", printErr);
                  }
                })();
              }}
            />
          </div>
        ) : (
          <>
            {/* "Datos guardados" hint removido a pedido — perfil é usado em background */}
            {hiddenCheckoutFeature("saved-profile-hint") && hasCustomerProfile() && (
              <p className="mt-3 text-[11px] text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                {t("savedProfileHint")}
              </p>
            )}

            {isTableOrder && mesaValidated && (
              <div className={`mt-3 bg-card rounded-2xl border border-border overflow-hidden ${showError === "phone" ? "ring-2 ring-destructive/40" : ""}`}>
                <div className={`px-3 py-2.5 ${showError === "table" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <Hash className="w-3 h-3 text-primary" />
                    {t("tableNumber")} <span className="text-destructive">*</span>
                  </label>
                  <p className="text-center text-3xl font-black text-primary tabular-nums py-1">{tableNumber}</p>
                  <p className="text-[10px] text-center text-muted-foreground">Mesa validada por QR code</p>
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
                <div className="px-3 py-3 border-t border-border space-y-2">
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

            {/* Cupón oculto — código mantido, será reativado posteriormente */}
            {hiddenCheckoutFeature("coupon") && !isTableOrder && (
              <div className="mt-3 bg-card rounded-2xl border border-border p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Cupón</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                    placeholder="CÓDIGO"
                    className="flex-1 h-9 px-3 rounded-lg border border-border font-bold uppercase text-sm"
                  />
                  <button type="button" onClick={applyCoupon} className="px-3 h-9 rounded-lg bg-gradient-primary text-primary-foreground font-bold text-xs shadow-primary">Aplicar</button>
                </div>
                {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
              </div>
            )}

            {/* Aviso "Pagamentos online não activos" oculto — não bloqueia checkout (fallback automático para dinheiro/balcão) */}
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
                    ? "Pagamento online obrigatório — active os recebimentos ou peça ajuda à equipa."
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
                        onClick={() => {
                          setSelected(pm.id);
                          setShowError(null);
                          if (pm.id === "cash" || pm.id === "counter") {
                            setStripeClientSecret(null);
                            setStripePaymentIntentId(null);
                            setStripePaymentMeta(null);
                          }
                        }}
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
                      Apple Pay e Google Pay aparecem automaticamente se o seu telemóvel suportar.
                    </p>
                  )}
                  {/* Aviso amber abaixo de Efectivo removido — confirmação acontece em tela dedicada após finalizar */}
                </div>
                {showError === "method" && (
                  <p className="text-xs text-destructive font-bold mt-1.5 px-1">Seleccione uma forma de pagamento para continuar.</p>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {!stripeClientSecret && (
        <div className="shrink-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
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
              onClick={confirm}
              disabled={!canFinalize}
              className="w-full flex items-center justify-between gap-3 py-3.5 px-4 bg-gradient-cta text-success-foreground rounded-2xl font-black text-base disabled:opacity-40 touch-action-manipulation"
            >
              <span className="flex items-center gap-2">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {processing ? t("processing") : isTableOrder ? "Pagar e finalizar" : t("finalizeOrder")}
              </span>
              <span className="bg-white/20 rounded-full px-3 py-0.5 tabular-nums text-sm">{grandTotal.toFixed(2)}€</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
