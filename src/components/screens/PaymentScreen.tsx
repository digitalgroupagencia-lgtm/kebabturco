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
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, ChevronRight, User, Hash, Phone, MapPin, Home, Mailbox, FileText, Bike, Loader2 } from "lucide-react";
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
  apple: { pt: "Pagar com iPhone", en: "Pay with iPhone", es: "Pago con iPhone", fr: "Payer avec iPhone" },
  google: { pt: "Pagar com Android", en: "Pay with Android", es: "Pago con Android", fr: "Payer avec Android" },
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
  const { items, totalPrice, clearCart, orderType } = useCart();
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

  const { quote: deliveryQuote } = useDeliveryFee(
    orderType === "delivery" ? storeId : null,
    deliveryPostalCode,
    deliveryCity,
    totalPrice,
  );
  const deliveryFee = orderType === "delivery" ? deliveryQuote.fee : 0;
  const grandTotal = Math.max(0, totalPrice + deliveryFee - couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode.trim() || !storeId) return;
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

  const counterOnly = settings?.payment_mode === "counter";
  const orderTypeDb = orderType === "here" ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway";

  useEffect(() => {
    if (counterOnly) setSelected("counter");
  }, [counterOnly]);

  useEffect(() => {
    if (enabledMethods.length === 1) {
      setSelected(enabledMethods[0].id);
      return;
    }
    if (selected && !enabledMethods.some((m) => m.id === selected)) {
      setSelected(null);
    }
  }, [enabledMethods, selected]);

  const validate = () => {
    if (!mesaLocked && (!customerName.trim() || customerName.trim().length < 2)) {
      setShowError("name");
      return false;
    }
    if (orderType === "here" && !tableNumber.trim()) {
      setShowError("table");
      return false;
    }
    if (orderType === "takeaway" && (!customerPhone.trim() || customerPhone.trim().length < 6)) {
      setShowError("phone");
      return false;
    }
    if (orderType === "delivery") {
      if (!customerPhone.trim() || customerPhone.trim().length < 6) { setShowError("phone"); return false; }
      if (!deliveryAddress.trim()) { setShowError("address"); return false; }
      if (!deliveryNumber.trim()) { setShowError("number"); return false; }
      if (!deliveryPostalCode.trim()) { setShowError("postal"); return false; }
      if (!deliveryCity.trim()) { setShowError("city"); return false; }
      if (deliveryQuote.belowMinimum) { setShowError("minOrder"); return false; }
    }
    if (!selected) { setShowError("method"); return false; }
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
      customerPhone: customerPhone.trim() || null,
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

    await subscribePush({
      storeId,
      orderId: result.order_id,
      customerPhone: customerPhone.trim() || undefined,
    });

    await invokePrintOrder(buildPrintPayload({
      storeId,
      orderNumber: result.order_number,
      orderType: orderTypeDb,
      tableNumber: tableNumber.trim() || null,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
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

  const confirm = async () => {
    if (processing || !validate() || !selected) return;

    if (selected === "card" && stripeEnabled && settings?.payment_mode !== "counter") {
      setProcessing(true);
      try {
        const amountCents = Math.round(grandTotal * 100);
        const { clientSecret, paymentIntentId } = await createStripePaymentIntent({
          storeId,
          amountCents,
          orderType: orderTypeDb,
        });
        setStripePaymentIntentId(paymentIntentId);
        setStripeClientSecret(clientSecret);
      } catch (e) {
        console.error(e);
        await finishOrder({ paymentMethod: selected, paymentStatus: "pending" });
      } finally {
        setProcessing(false);
      }
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

  return (
    <div className="relative min-h-[100dvh] bg-secondary/20 animate-fade-in flex flex-col">
      <ScreenHeader eyebrow={t("finalStep")} title={t("pay")} onBack={() => setScreen("review")} sticky />

      <div className="px-4 pt-4 pb-32">
        <div className="relative bg-card rounded-[28px] p-6 border border-border shadow-card overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-price/5 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">{t("totalToPay")}</p>
              <p className="text-[44px] leading-none font-black text-price mt-1.5 tabular-nums tracking-tight">{grandTotal.toFixed(2)}€</p>
              <p className="text-[11px] text-muted-foreground mt-1">{items.length} {items.length === 1 ? t("oneItem") : t("items")} · {t("taxesIncluded")}</p>
            </div>
            {logoUrl && <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded-xl bg-secondary/50 p-1" />}
          </div>
          {mesaLocked && tableNumber && (
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-2 text-primary">
              <Hash className="w-5 h-5" />
              <span className="text-xl font-black">Mesa {tableNumber}</span>
            </div>
          )}
        </div>

        {stripeClientSecret ? (
          <div className="mt-5 bg-card rounded-[24px] border border-border shadow-card p-4">
            <p className="text-sm font-black text-foreground mb-3">Pagamento com cartão</p>
            <StripePaymentForm
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
            <div className="mt-5 bg-card rounded-[24px] border border-border shadow-card overflow-hidden">
              {!mesaLocked && (
                <div className={`px-4 py-4 ${showError === "name" ? "bg-destructive/5 animate-pulse" : ""}`}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {t("yourName")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value.slice(0, 40)); if (showError === "name") setShowError(null); }}
                    placeholder="—"
                    className={`w-full h-12 px-4 text-base font-bold bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary ${showError === "name" ? "border-destructive/60" : "border-transparent"}`}
                  />
                </div>
              )}

              {orderType === "here" && !mesaLocked && (
                <div className={`px-4 py-4 border-t border-border ${showError === "table" ? "bg-destructive/5 animate-pulse" : ""}`}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    {t("tableNumber")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={tableNumber}
                    onChange={(e) => { setTableNumber(e.target.value.replace(/\D/g, "").slice(0, 4)); if (showError === "table") setShowError(null); }}
                    className={`w-full h-14 px-4 text-center text-2xl font-black tabular-nums bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary ${showError === "table" ? "border-destructive/60" : "border-transparent"}`}
                  />
                </div>
              )}

              {(orderType === "takeaway" || orderType === "delivery") && (
                <div className={`px-4 py-4 border-t border-border ${showError === "phone" ? "bg-destructive/5 animate-pulse" : ""}`}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    {t("yourPhone")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20)); if (showError === "phone") setShowError(null); }}
                    className={`w-full h-12 px-4 text-base font-bold bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary ${showError === "phone" ? "border-destructive/60" : "border-transparent"}`}
                  />
                </div>
              )}

              {orderType === "delivery" && (
                <>
                  <div className={`px-4 py-4 border-t border-border ${showError === "address" ? "bg-destructive/5 animate-pulse" : ""}`}>
                    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {t("addressStreet")} <span className="text-destructive">*</span>
                    </label>
                    <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value.slice(0, 120))} className="w-full h-12 px-4 font-bold bg-secondary/60 rounded-2xl border-2 border-transparent focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-border">
                    <input type="text" value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value.slice(0, 10))} placeholder={t("addressNumber")} className="h-12 px-4 font-bold bg-secondary/60 rounded-2xl border-2 border-transparent" />
                    <input type="text" value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={t("addressPostal")} className="h-12 px-4 font-bold bg-secondary/60 rounded-2xl border-2 border-transparent" />
                  </div>
                  <div className={`px-4 py-4 border-t border-border ${showError === "city" || showError === "minOrder" ? "bg-destructive/5" : ""}`}>
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => { setDeliveryCity(e.target.value.slice(0, 60)); if (showError === "city" || showError === "minOrder") setShowError(null); }}
                      placeholder={t("addressCity")}
                      className={`w-full h-12 px-4 font-bold bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary ${showError === "city" ? "border-destructive/60" : "border-transparent"}`}
                    />
                    {deliveryQuote.zone && deliveryPostalCode.trim() && deliveryCity.trim() && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-bold text-foreground">{deliveryQuote.zone.name}</span>
                        {" · "}
                        {deliveryQuote.fee > 0
                          ? `+${deliveryQuote.fee.toFixed(2)}€ entrega`
                          : "Entrega grátis"}
                        {" · "}
                        Mín. {deliveryQuote.minOrder.toFixed(0)}€
                      </p>
                    )}
                    {showError === "minOrder" && deliveryQuote.minOrder > 0 && (
                      <p className="text-xs text-destructive font-bold mt-1">
                        Pedido mínimo para esta zona: {deliveryQuote.minOrder.toFixed(2)}€
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 bg-card rounded-[24px] border border-border shadow-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2">Cupón de descuento</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                  placeholder="CÓDIGO"
                  className="flex-1 h-11 px-3 rounded-xl border border-border font-bold uppercase"
                />
                <button type="button" onClick={applyCoupon} className="px-4 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Aplicar</button>
              </div>
              {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
              {couponDiscount > 0 && <p className="text-xs text-success mt-1 font-bold">−{couponDiscount.toFixed(2)}€ aplicado</p>}
            </div>

            {counterOnly ? (
              <div className="mt-5 bg-card rounded-[24px] border-2 border-success/40 p-5 flex items-center gap-4">
                <Store className="w-7 h-7 text-success" />
                <p className="font-black">{t("payAtCounterTitle")}</p>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground px-1 mb-2">{t("pickMethod")}</p>
                <div className="flex flex-col gap-2">
                  {enabledMethods.map((pm) => {
                    const isSel = selected === pm.id;
                    return (
                      <button
                        key={pm.id}
                        onClick={() => setSelected(pm.id)}
                        className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all ${isSel ? "border-success ring-2 ring-success/15" : "border-border"}`}
                      >
                        <pm.icon className="w-5 h-5" />
                        <div className="flex-1 text-left">
                          <p className="font-black">{tProduct(METHOD_LABELS[pm.id])}</p>
                          <p className="text-xs text-muted-foreground">{tProduct(METHOD_SUBS[pm.id])}</p>
                        </div>
                        {isSel && <Check className="w-5 h-5 text-success" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!stripeClientSecret && (
        <div className="sticky left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          <button
            onClick={confirm}
            disabled={processing}
            className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-[26px] font-black disabled:opacity-40"
          >
            <span>{processing ? t("processing") : t("finalizeOrder")}</span>
            <span className="bg-white/20 rounded-full px-3.5 py-1 tabular-nums">{grandTotal.toFixed(2)}€</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentScreen;
