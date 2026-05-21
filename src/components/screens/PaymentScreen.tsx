import { useEffect, useMemo, useState } from "react";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, ChevronRight, User, Hash, Phone, MapPin, Home, Mailbox, FileText, Bike } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";


const METHOD_DEFS: { id: PaymentMethodId; icon: any }[] = [
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
  card: { pt: "Crédito ou débito no TPV", en: "Credit or debit at TPV", es: "Crédito o débito en el TPV", fr: "Carte au TPV" },
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
    generateOrderNumber,
    setPaymentMethod,
    storeId,
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
  } = useOrder();
  const { items, totalPrice, clearCart, orderType } = useCart();
  const { settings } = useOperationsSettings();
  const brandingCtx = useBranding();
  const { t, lang, tProduct } = useLanguage();
  const logoUrl = brandingCtx?.settings?.logo_main_url ?? null;
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showError, setShowError] = useState<null | "name" | "table" | "phone" | "address" | "number" | "postal" | "city" | "method" | "minOrder">(null);

  // Calcula taxa de entrega automaticamente quando for delivery
  const { quote: deliveryQuote } = useDeliveryFee(
    orderType === "delivery" ? storeId : null,
    deliveryPostalCode,
    deliveryCity,
    totalPrice,
  );
  const deliveryFee = orderType === "delivery" ? deliveryQuote.fee : 0;
  const grandTotal = totalPrice + deliveryFee;


  const enabledMethods = useMemo(() => {
    if (!settings) return METHOD_DEFS;
    const map: Record<PaymentMethodId, boolean> = {
      card: settings.pay_card_enabled,
      cash: settings.pay_cash_enabled,
      pix: settings.pay_pix_enabled,
      apple: settings.pay_apple_enabled,
      google: settings.pay_google_enabled,
      counter: settings.pay_counter_enabled,
      link: settings.pay_link_enabled,
    };
    return METHOD_DEFS.filter((m) => map[m.id]);
  }, [settings]);

  const counterOnly = settings?.payment_mode === "counter";

  useEffect(() => {
    if (counterOnly) setSelected("counter");
  }, [counterOnly]);

  const confirm = async () => {
    if (processing) return;
    if (!customerName.trim() || customerName.trim().length < 2) { setShowError("name"); return; }
    if (orderType === "here" && !tableNumber.trim()) { setShowError("table"); return; }
    if (orderType === "takeaway" && (!customerPhone.trim() || customerPhone.trim().length < 6)) { setShowError("phone"); return; }
    if (orderType === "delivery") {
      if (!customerPhone.trim() || customerPhone.trim().length < 6) { setShowError("phone"); return; }
      if (!deliveryAddress.trim()) { setShowError("address"); return; }
      if (!deliveryNumber.trim()) { setShowError("number"); return; }
      if (!deliveryPostalCode.trim()) { setShowError("postal"); return; }
      if (!deliveryCity.trim()) { setShowError("city"); return; }
      if (deliveryQuote.belowMinimum) { setShowError("minOrder"); return; }
    }
    if (!selected) { setShowError("method"); return; }
    setShowError(null);
    await persistAndPrint(customerName.trim(), tableNumber.trim(), customerPhone.trim());
  };


  const persistAndPrint = async (
    finalName: string,
    finalTable: string,
    finalPhone: string,
  ) => {
    if (!selected || processing) return;
    setProcessing(true);
    try {
      // Gera número e fixa o método
      const orderNumber = String(Math.floor(100 + Math.random() * 900));
      setPaymentMethod(selected);
      generateOrderNumber();

      // Salva pedido no banco (anon insert permitido)
      const paymentMethodDb =
        selected === "apple" ? "apple_pay" : selected === "google" ? "google_pay" : selected;
      try {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            store_id: storeId,
            order_number: orderNumber,
            order_type: orderType === "here" ? "dine_in" : orderType === "delivery" ? "delivery" : "takeaway",
            table_number: finalTable || null,
            customer_name: finalName || null,
            customer_phone: finalPhone || null,
            payment_method:
              ["card", "cash", "apple_pay", "google_pay", "pix"].includes(paymentMethodDb)
                ? (paymentMethodDb as "card" | "cash" | "apple_pay" | "google_pay" | "pix")
                : null,
            source: "totem",
            subtotal: totalPrice,
            total: grandTotal,
            notes: orderType === "delivery" && deliveryFee > 0
              ? `Taxa entrega: ${deliveryFee.toFixed(2)}€${deliveryQuote.zone ? ` (${deliveryQuote.zone.name})` : ""}`
              : null,

          })
          .select("id")
          .single();
        if (!orderErr && order) {
          await supabase.from("order_items").insert(
            items.map((i) => ({
              order_id: order.id,
              product_id: i.productId,
              product_name: (i.productName?.es || i.productName?.en || Object.values(i.productName)[0]) as string,
              quantity: i.quantity,
              size_name: i.sizeName ? (i.sizeName.es || i.sizeName.en || Object.values(i.sizeName)[0]) : null,
              unit_price: i.unitPrice,
              total_price: i.totalPrice,
              extras: i.extras as unknown as import("@/integrations/supabase/types").Json,
              removed: i.removedIngredients as unknown as import("@/integrations/supabase/types").Json,
            }))
          );
        }
      } catch (_persistErr) {
        // não bloqueia o cliente se a persistência falhar
      }

      // Dispara impressão (ignora erro pra não bloquear o cliente)
      try {
        await supabase.functions.invoke("print-order", {
          body: {
            storeId,
            orderNumber,
            tableNumber: finalTable || null,
            customerName: finalName || null,
            customerPhone: finalPhone || null,
            orderType,
            deliveryAddress: orderType === "delivery" ? {
              street: deliveryAddress,
              number: deliveryNumber,
              complement: deliveryComplement || null,
              postalCode: deliveryPostalCode,
              city: deliveryCity,
              notes: deliveryNotes || null,
            } : null,
            paymentMethod: selected,
            paymentPending: selected === "counter",
            items: items.map((i) => ({
              productName: (i.productName?.es || i.productName?.en || Object.values(i.productName)[0]) as string,
              quantity: i.quantity,
              size: i.sizeName ? (i.sizeName.es || i.sizeName.en || Object.values(i.sizeName)[0]) : null,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              extras: i.extras.map((e) => ({
                name: (e.name?.es || e.name?.en || Object.values(e.name)[0]) as string,
                quantity: e.quantity,
                price: e.price,
              })),
              removed: i.removedIngredients,
            })),
            deliveryFee: orderType === "delivery" ? deliveryFee : 0,
            subtotal: totalPrice,
            total: grandTotal,

          },
        });
      } catch (_e) {
        // Falha de impressão não bloqueia o pedido
      }

      clearCart();
      setScreen("confirmation");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-secondary/20 animate-fade-in flex flex-col">
      <ScreenHeader
        eyebrow={t("finalStep")}
        title={t("pay")}
        onBack={() => setScreen("review")}
        sticky
      />

      <div className="px-4 pt-4">
        {/* Total protagonista */}
        <div className="relative bg-card rounded-[28px] p-6 border border-border shadow-card overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-price/5 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">{t("totalToPay")}</p>
              <p className="text-[44px] leading-none font-black text-price mt-1.5 tabular-nums tracking-tight">
                {totalPrice.toFixed(2)}€
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{items.length} {items.length === 1 ? t("oneItem") : t("items")} · {t("taxesIncluded")}</p>
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded-xl bg-secondary/50 p-1" />
            )}
          </div>
        </div>

        {/* Dados do cliente — obrigatório aqui antes do método */}
        <div className="mt-5 bg-card rounded-[24px] border border-border shadow-card overflow-hidden">
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
              className={`w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                showError === "name" ? "border-destructive/60" : "border-transparent"
              }`}
            />
          </div>

          {orderType === "here" && (
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
                placeholder="—"
                className={`w-full h-14 px-4 text-center text-2xl font-black text-foreground tabular-nums tracking-wider bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                  showError === "table" ? "border-destructive/60" : "border-transparent"
                }`}
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
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => { setCustomerPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20)); if (showError === "phone") setShowError(null); }}
                placeholder="+34 600 000 000"
                className={`w-full h-12 px-4 text-base font-bold text-foreground tabular-nums bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                  showError === "phone" ? "border-destructive/60" : "border-transparent"
                }`}
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
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => { setDeliveryAddress(e.target.value.slice(0, 120)); if (showError === "address") setShowError(null); }}
                  placeholder={t("addressStreetPh")}
                  className={`w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                    showError === "address" ? "border-destructive/60" : "border-transparent"
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-border">
                <div className={showError === "number" ? "animate-pulse" : ""}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    <Home className="w-3.5 h-3.5 text-primary" />
                    {t("addressNumber")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryNumber}
                    onChange={(e) => { setDeliveryNumber(e.target.value.slice(0, 10)); if (showError === "number") setShowError(null); }}
                    placeholder="12"
                    className={`w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                      showError === "number" ? "border-destructive/60" : "border-transparent"
                    }`}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    {t("addressFloor")}
                  </label>
                  <input
                    type="text"
                    value={deliveryComplement}
                    onChange={(e) => setDeliveryComplement(e.target.value.slice(0, 30))}
                    placeholder={t("addressFloorPh")}
                    className="w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-border">
                <div className={showError === "postal" ? "animate-pulse" : ""}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    <Mailbox className="w-3.5 h-3.5 text-primary" />
                    {t("addressPostal")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={deliveryPostalCode}
                    onChange={(e) => { setDeliveryPostalCode(e.target.value.replace(/\D/g, "").slice(0, 8)); if (showError === "postal") setShowError(null); }}
                    placeholder="46700"
                    className={`w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                      showError === "postal" ? "border-destructive/60" : "border-transparent"
                    }`}
                  />
                </div>
                <div className={showError === "city" ? "animate-pulse" : ""}>
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                    {t("addressCity")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value.slice(0, 60)); if (showError === "city") setShowError(null); }}
                    placeholder="Gandia"
                    className={`w-full h-12 px-4 text-base font-bold text-foreground bg-secondary/60 rounded-2xl border-2 focus:outline-none focus:border-primary focus:bg-card transition-colors ${
                      showError === "city" ? "border-destructive/60" : "border-transparent"
                    }`}
                  />
                </div>
              </div>
              <div className="px-4 py-4 border-t border-border">
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {t("addressNotes")}
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value.slice(0, 200))}
                  placeholder={t("addressNotesPh")}
                  rows={2}
                  className="w-full px-4 py-3 text-sm font-medium text-foreground bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors resize-none"
                />
              </div>
            </>
          )}
        </div>

        {counterOnly ? (
          <div className="mt-5 bg-card rounded-[24px] border-2 border-success/40 p-5 flex items-center gap-4 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-success text-success-foreground flex items-center justify-center shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-success font-black">{t("modeLabel")}</p>
              <p className="font-black text-foreground text-[17px] mt-0.5">{t("payAtCounterTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("payAtCounterSub")}</p>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground px-1 mb-2">{t("pickMethod")}</p>
            <div className="flex flex-col gap-2">
              {enabledMethods.map((pm) => {
                const isSel = selected === pm.id;
                const isCounter = pm.id === "counter";
                const label = tProduct(METHOD_LABELS[pm.id]);
                const subtitle = tProduct(METHOD_SUBS[pm.id]);
                return (
                  <button
                    key={pm.id}
                    onClick={() => setSelected(pm.id)}
                    className={`relative flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.99] touch-action-manipulation overflow-hidden ${
                      isSel
                        ? "bg-card border-success shadow-[0_8px_24px_-12px_hsl(var(--success)/0.5)] ring-2 ring-success/15"
                        : "bg-card border-border hover:border-foreground/20"
                    }`}
                  >
                    {isSel && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-success" />
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSel ? "bg-success text-success-foreground" : isCounter ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-foreground"
                    }`}>
                      <pm.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-foreground text-[15px]">{label}</p>
                        {isCounter && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/20 text-accent-foreground">
                            {t("modeLabel")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      isSel ? "bg-success border-success" : "border-border"
                    }`}>
                      {isSel && <Check className="w-3.5 h-3.5 text-success-foreground" strokeWidth={3.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        className="sticky left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]"
        style={{ bottom: 0 }}
      >
        <button
          onClick={confirm}
          disabled={processing}
          className={`w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-[26px] shadow-cta active:scale-[0.98] transition-transform touch-action-manipulation disabled:opacity-40 disabled:shadow-none ${
            !processing ? "animate-pulse-cta" : ""
          }`}
        >
          <span className="text-[15px] font-black tracking-wide uppercase flex items-center gap-2">
            {processing ? t("processing") : t("finalizeOrder")}
            {!processing && <ChevronRight className="w-4 h-4" strokeWidth={3} />}
          </span>
          <span className="text-[15px] font-black bg-white/20 rounded-full px-3.5 py-1 tabular-nums">
            {totalPrice.toFixed(2)}€
          </span>
        </button>
      </div>

    </div>
  );
};

export default PaymentScreen;
