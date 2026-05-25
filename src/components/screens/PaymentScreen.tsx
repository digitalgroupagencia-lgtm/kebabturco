import { useEffect, useMemo, useState } from "react";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import StripePaymentForm from "@/components/StripePaymentForm";
import {
  createCustomerOrder,
  createStripePaymentIntent,
  buildPrintPayload,
  invokePrintOrder,
  fetchStoreStripeSettings,
  validateCoupon,
} from "@/services/orderService";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { filterImplementedPaymentMethods } from "@/lib/paymentMethods";
import { loadSavedOrderType } from "@/lib/customerSession";
import { syncActiveOrderUrl } from "@/lib/customerOrderUrl";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import PhoneInput from "@/components/PhoneInput";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, User, Hash, Phone, MapPin, Loader2, AlertCircle } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";

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
  cash: { pt: "Dinheiro", en: "Cash", es: "Efectivo", fr: "Espèces" },
  pix: { pt: "Pix", en: "Pix", es: "Pix", fr: "Pix" },
  apple: { pt: "Apple Pay", en: "Apple Pay", es: "Apple Pay", fr: "Apple Pay" },
  google: { pt: "Google Pay", en: "Google Pay", es: "Google Pay", fr: "Google Pay" },
  link: { pt: "Link de pagamento", en: "Payment link", es: "Link de pago", fr: "Lien de paiement" },
  counter: { pt: "Pagar no balcão", en: "Pay at counter", es: "Pago en mostrador", fr: "Payer au comptoir" },
};

const METHOD_SUBS: Record<PaymentMethodId, Record<string, string>> = {
  card: { pt: "Pagamento seguro online", en: "Secure online payment", es: "Pago seguro online", fr: "Paiement sécurisé en ligne" },
  cash: { pt: "Pagamento em dinheiro", en: "Cash payment", es: "Pago en efectivo", fr: "Paiement en espèces" },
  pix: { pt: "Pagamento instantâneo", en: "Instant payment", es: "Pago instantáneo", fr: "Paiement instantané" },
  apple: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  google: { pt: "Em breve", en: "Coming soon", es: "Próximamente", fr: "Bientôt" },
  link: { pt: "Receba um link", en: "Get a link", es: "Recibe un enlace", fr: "Recevoir un lien" },
  counter: { pt: "Pague ao retirar", en: "Pay when picking up", es: "Paga al recoger tu pedido", fr: "Payer au retrait" },
};

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
    deliveryComplement,
    setDeliveryComplement,
    deliveryPostalCode,
    setDeliveryPostalCode,
    deliveryCity,
    setDeliveryCity,
    deliveryNotes,
    setDeliveryNotes,
  } = useOrder();
  const { items, totalPrice, clearCart, orderType, setOrderType } = useCart();
  const { settings } = useOperationsSettings();
  const brandingCtx = useBranding();
  const { t, tProduct } = useLanguage();
  const logoUrl = brandingCtx?.settings?.logo_main_url ?? null;
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [showError, setShowError] = useState<null | "name" | "table" | "phone" | "address" | "number" | "postal" | "city" | "method" | "minOrder">(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const { subscribe: subscribePush } = usePushNotifications();

  const isTableOrder = orderType === "here";
  const fullCustomerPhone = formatFullPhone(phoneDialCode, customerPhone);
  const orderTypeDb = isTableOrder ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway";

  const { quote: deliveryQuote } = useDeliveryFee(
    orderType === "delivery" ? storeId : null,
    deliveryPostalCode,
    deliveryCity,
    totalPrice,
  );
  const deliveryFee = orderType === "delivery" ? deliveryQuote.fee : 0;
  const grandTotal = Math.max(0, totalPrice + deliveryFee - couponDiscount);

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
    fetchStoreStripeSettings(storeId)
      .then((data) => setStripeEnabled(!!data?.stripe_charges_enabled))
      .catch(() => setStripeEnabled(false));
  }, [storeId]);

  const enabledMethods = useMemo(() => {
    const baseIds: PaymentMethodId[] = settings
      ? (METHOD_DEFS.filter((m) => {
          const map: Record<PaymentMethodId, boolean> = {
            card: settings.pay_card_enabled,
            cash: settings.pay_cash_enabled,
            pix: settings.pay_pix_enabled,
            apple: settings.pay_apple_enabled,
            google: settings.pay_google_enabled,
            counter: settings.pay_counter_enabled,
            link: settings.pay_link_enabled,
          };
          return map[m.id];
        }).map((m) => m.id))
      : ["counter"];

    const implemented = filterImplementedPaymentMethods(baseIds, stripeEnabled);
    return METHOD_DEFS.filter((m) => implemented.includes(m.id));
  }, [settings, stripeEnabled]);

  /** Mesa: cartão online; se Stripe indisponível, balcão para não bloquear o cliente. */
  const checkoutMethods = useMemo(() => {
    if (isTableOrder) {
      if (stripeEnabled) return METHOD_DEFS.filter((m) => m.id === "card");
      return METHOD_DEFS.filter((m) => m.id === "counter");
    }
    if (settings?.payment_mode === "counter") {
      return METHOD_DEFS.filter((m) => m.id === "counter");
    }
    return enabledMethods.length > 0 ? enabledMethods : METHOD_DEFS.filter((m) => m.id === "counter");
  }, [isTableOrder, stripeEnabled, settings?.payment_mode, enabledMethods]);

  const counterOnly = !isTableOrder && settings?.payment_mode === "counter";
  const tablePayReady = isTableOrder && checkoutMethods.length > 0;
  const canFinalize = checkoutMethods.length > 0 && Boolean(selected) && !processing;

  useEffect(() => {
    if (counterOnly) setSelected("counter");
  }, [counterOnly]);

  useEffect(() => {
    if (isTableOrder && stripeEnabled) {
      setSelected("card");
      return;
    }
    if (isTableOrder && !stripeEnabled) {
      setSelected("counter");
      return;
    }
    if (checkoutMethods.length === 1) {
      setSelected(checkoutMethods[0].id);
      return;
    }
    if (selected && !checkoutMethods.some((m) => m.id === selected)) {
      setSelected(null);
    }
  }, [checkoutMethods, selected, isTableOrder, stripeEnabled]);

  const validate = () => {
    if (!orderType) {
      setShowError("method");
      return false;
    }
    if (isTableOrder) {
      if (!tableNumber.trim()) {
        setShowError("table");
        return false;
      }
      if (!mesaLocked && (!customerName.trim() || customerName.trim().length < 2)) {
        setShowError("name");
        return false;
      }
    } else if (!customerName.trim() || customerName.trim().length < 2) {
      setShowError("name");
      return false;
    }
    if (!isValidCustomerPhone(phoneDialCode, customerPhone)) {
      setShowError("phone");
      return false;
    }
    if (orderType === "delivery") {
      if (!deliveryAddress.trim()) { setShowError("address"); return false; }
      if (!deliveryNumber.trim()) { setShowError("number"); return false; }
      if (!deliveryPostalCode.trim()) { setShowError("postal"); return false; }
      if (!deliveryCity.trim()) { setShowError("city"); return false; }
      if (deliveryQuote.belowMinimum) { setShowError("minOrder"); return false; }
    }
    if (checkoutMethods.length === 0) {
      setShowError("method");
      return false;
    }
    if (!selected) {
      setShowError("method");
      return false;
    }
    if (isTableOrder && stripeEnabled && selected !== "card") {
      setShowError("method");
      return false;
    }
    if (isTableOrder && !stripeEnabled && selected !== "counter") {
      setShowError("method");
      return false;
    }
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

  const finishOrder = async (opts: {
    paymentMethod: PaymentMethodId;
    paymentStatus: "pending" | "paid";
    stripePi?: string | null;
  }) => {
    if (isTableOrder && opts.paymentMethod === "card" && opts.paymentStatus !== "paid") {
      setShowError("method");
      return;
    }

    const paymentMethodDb =
      opts.paymentMethod === "apple" ? "apple_pay"
        : opts.paymentMethod === "google" ? "google_pay"
          : opts.paymentMethod === "counter" || opts.paymentMethod === "link" ? null
            : opts.paymentMethod;

    const result = await createCustomerOrder({
      storeId,
      orderType: orderTypeDb,
      items,
      subtotal: totalPrice,
      total: grandTotal,
      tableNumber: tableNumber.trim() || null,
      tableId: mesaTableId,
      customerName: customerName.trim() || null,
      customerPhone: fullCustomerPhone || null,
      notes,
      paymentMethod: paymentMethodDb,
      paymentStatus: opts.paymentStatus,
      stripePaymentIntentId: opts.stripePi || null,
      deliveryStreet: orderType === "delivery" ? deliveryAddress.trim() : null,
      deliveryNumber: orderType === "delivery" ? deliveryNumber.trim() : null,
      deliveryComplement: orderType === "delivery" ? deliveryComplement.trim() : null,
      deliveryPostalCode: orderType === "delivery" ? deliveryPostalCode.trim() : null,
      deliveryCity: orderType === "delivery" ? deliveryCity.trim() : null,
      deliveryNotes: orderType === "delivery" ? deliveryNotes.trim() : null,
      deliveryFee,
      deliveryZoneId: deliveryQuote.zone?.id || null,
      deliveryZoneName: deliveryQuote.zone?.name || null,
      couponCode: couponId ? couponCode.trim() : null,
      discountAmount: couponDiscount,
      couponId,
    });

    setPaymentMethod(opts.paymentMethod);
    setOrderPaymentStatus(opts.paymentStatus);
    setOrderNumber(result.order_number);
    setActiveOrderId(result.order_id);
    setTrackingOrderId(result.order_id);
    syncActiveOrderUrl(result.order_id, "confirmation");

    await subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: fullCustomerPhone || undefined,
    });

    await invokePrintOrder(buildPrintPayload({
      storeId,
      orderNumber: result.order_number,
      orderType: orderTypeDb,
      tableNumber: tableNumber.trim() || null,
      customerName: customerName.trim() || null,
      customerPhone: fullCustomerPhone || null,
      paymentMethod: opts.paymentMethod,
      paymentPending: opts.paymentStatus !== "paid",
      paidViaApp: opts.paymentStatus === "paid",
      items,
      total: grandTotal,
      subtotal: totalPrice,
      deliveryFee,
      notes,
      deliveryAddress: orderType === "delivery" ? deliveryAddress.trim() : null,
      deliveryNumber: orderType === "delivery" ? deliveryNumber.trim() : null,
      deliveryCity: orderType === "delivery" ? deliveryCity.trim() : null,
      deliveryPostalCode: orderType === "delivery" ? deliveryPostalCode.trim() : null,
    }));

    clearCart();
    setScreen("confirmation");
  };

  const startCardPayment = async () => {
    const amountCents = Math.round(grandTotal * 100);
    const { clientSecret, paymentIntentId } = await createStripePaymentIntent({
      storeId,
      amountCents,
      orderType: orderTypeDb,
    });
    setStripePaymentIntentId(paymentIntentId);
    setStripeClientSecret(clientSecret);
  };

  const confirm = async () => {
    if (processing || !validate() || !selected) return;

    const needsStripe =
      selected === "card" && stripeEnabled && (isTableOrder || settings?.payment_mode !== "counter");

    if (needsStripe) {
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

    if (isTableOrder && selected === "card") {
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

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-secondary/20 animate-fade-in">
      <ScreenHeader
        eyebrow={t("finalStep")}
        title={isTableOrder ? "Pagamento na mesa" : t("pay")}
        onBack={() => setScreen("review")}
        sticky
      />

      <div className={`flex-1 overflow-y-auto overscroll-contain ${compact ? "px-3 pt-2 pb-24" : "px-4 pt-4 pb-28"}`}>
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

        {stripeClientSecret ? (
          <div className={`mt-3 bg-card rounded-2xl border border-border shadow-card ${compact ? "p-3" : "p-4 mt-5 rounded-[24px]"}`}>
            <p className="text-sm font-black text-foreground mb-2">Pagamento com cartão</p>
            <StripePaymentForm
              compact={compact}
              clientSecret={stripeClientSecret}
              amountLabel={`${grandTotal.toFixed(2)}€`}
              onCancel={() => { setStripeClientSecret(null); setStripePaymentIntentId(null); }}
              onSuccess={async () => {
                setProcessing(true);
                try {
                  await finishOrder({
                    paymentMethod: "card",
                    paymentStatus: "paid",
                    stripePi: stripePaymentIntentId,
                  });
                } finally {
                  setProcessing(false);
                  setStripeClientSecret(null);
                }
              }}
            />
          </div>
        ) : (
          <>
            {isTableOrder && (
              <div className={`mt-3 bg-card rounded-2xl border border-border overflow-hidden ${showError === "name" || showError === "table" || showError === "phone" ? "ring-2 ring-destructive/40" : ""}`}>
                <div className={`px-3 py-2.5 ${showError === "table" ? "bg-destructive/5" : ""}`}>
                  <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    <Hash className="w-3 h-3 text-primary" />
                    {t("tableNumber")} <span className="text-destructive">*</span>
                  </label>
                  {mesaLocked && tableNumber.trim() ? (
                    <p className="text-center text-3xl font-black text-primary tabular-nums py-1">{tableNumber}</p>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={tableNumber}
                      onChange={(e) => {
                        setTableNumber(e.target.value.replace(/\D/g, "").slice(0, 4));
                        if (showError === "table") setShowError(null);
                      }}
                      className={`w-full h-12 px-3 text-center text-2xl font-black tabular-nums bg-secondary/60 rounded-xl border-2 focus:outline-none focus:border-primary ${showError === "table" ? "border-destructive/60" : "border-transparent"}`}
                    />
                  )}
                </div>
                {!mesaLocked && (
                  <div className={`px-3 py-2.5 border-t border-border ${showError === "name" ? "bg-destructive/5" : ""}`}>
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
                      placeholder="—"
                      className={`w-full h-10 text-sm px-3 font-bold bg-secondary/60 rounded-xl border-2 focus:outline-none focus:border-primary ${showError === "name" ? "border-destructive/60" : "border-transparent"}`}
                    />
                  </div>
                )}
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

            {orderType === "takeaway" && (
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

            {orderType === "delivery" && (
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
                    <input type="text" value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value.slice(0, 10))} placeholder={t("addressNumber")} className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent" />
                    <input type="text" value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={t("addressPostal")} className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent" />
                  </div>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value.slice(0, 60)); if (showError === "city" || showError === "minOrder") setShowError(null); }}
                    placeholder={t("addressCity")}
                    className={`w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 ${showError === "city" ? "border-destructive/60" : "border-transparent"}`}
                  />
                  {showError === "minOrder" && deliveryQuote.minOrder > 0 && (
                    <p className="text-xs text-destructive font-bold">Pedido mínimo: {deliveryQuote.minOrder.toFixed(2)}€</p>
                  )}
                </div>
              </div>
            )}

            {!isTableOrder && (
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
                  <button type="button" onClick={applyCoupon} className="px-3 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-xs">Aplicar</button>
                </div>
                {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
              </div>
            )}

            {isTableOrder && !stripeEnabled && (
              <div className="mt-3 flex gap-2 items-start rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Pagamento online indisponível — finalize com pagamento no balcão. A equipa receberá o pedido na mesa {tableNumber || "—"}.
                </p>
              </div>
            )}

            {isTableOrder && stripeEnabled && !tablePayReady && (
              <div className="mt-3 flex gap-2 items-start rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-destructive">Pagamento online indisponível</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Para pedir na mesa é obrigatório pagar com cartão. Peça ajuda à equipa do restaurante.
                  </p>
                </div>
              </div>
            )}

            {counterOnly && !isTableOrder ? (
              <div className="mt-3 bg-card rounded-2xl border-2 border-success/40 p-4 flex items-center gap-3">
                <Store className="w-6 h-6 text-success shrink-0" />
                <p className="font-black text-sm">{t("payAtCounterTitle")}</p>
              </div>
            ) : checkoutMethods.length > 0 && (
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
                        onClick={() => { setSelected(pm.id); setShowError(null); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all touch-action-manipulation ${isSel ? "border-success bg-success/5" : "border-border bg-card"}`}
                      >
                        <pm.icon className="w-5 h-5 shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-black text-sm">{tProduct(METHOD_LABELS[pm.id])}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{tProduct(METHOD_SUBS[pm.id])}</p>
                        </div>
                        {isSel && <Check className="w-5 h-5 text-success shrink-0" />}
                      </button>
                    );
                  })}
                  {isTableOrder && stripeEnabled && (
                    <div className="flex gap-2 opacity-50 px-1 pt-0.5">
                      <div className="flex-1 flex items-center gap-2 p-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                        <Smartphone className="w-4 h-4" /> Apple Pay · em breve
                      </div>
                      <div className="flex-1 flex items-center gap-2 p-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                        <Smartphone className="w-4 h-4" /> Google Pay · em breve
                      </div>
                    </div>
                  )}
                </div>
                {showError === "method" && (
                  <p className="text-xs text-destructive font-bold mt-1.5 px-1">Seleccione uma forma de pagamento para continuar.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!stripeClientSecret && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-t border-border px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
