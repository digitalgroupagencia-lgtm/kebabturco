import { useEffect, useMemo, useState } from "react";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check, ChevronRight } from "lucide-react";
import ScreenHeader from "@/components/ScreenHeader";

const ALL_METHODS: { id: PaymentMethodId; icon: any; label: string; subtitle: string }[] = [
  { id: "card", icon: CreditCard, label: "Tarjeta", subtitle: "Crédito o débito en el TPV" },
  { id: "cash", icon: Banknote, label: "Efectivo", subtitle: "Pago en efectivo" },
  { id: "pix", icon: QrCode, label: "Pix", subtitle: "Pago instantáneo" },
  { id: "apple", icon: Smartphone, label: "Apple Pay", subtitle: "Pago con iPhone" },
  { id: "google", icon: Smartphone, label: "Google Pay", subtitle: "Pago con Android" },
  { id: "link", icon: Link2, label: "Link de pago", subtitle: "Recibe un enlace" },
  { id: "counter", icon: Store, label: "Pagar en mostrador", subtitle: "Paga al recoger tu pedido" },
];

const PaymentScreen = () => {
  const {
    setScreen,
    generateOrderNumber,
    setPaymentMethod,
    storeId,
    tableNumber,
    customerName,
    customerPhone,
  } = useOrder();
  const { items, totalPrice, clearCart, orderType } = useCart();
  const { settings } = useOperationsSettings();
  const brandingCtx = useBranding();
  const logoUrl = brandingCtx?.settings?.logo_main_url ?? null;
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const [processing, setProcessing] = useState(false);

  const enabledMethods = useMemo(() => {
    if (!settings) return ALL_METHODS;
    const map: Record<PaymentMethodId, boolean> = {
      card: settings.pay_card_enabled,
      cash: settings.pay_cash_enabled,
      pix: settings.pay_pix_enabled,
      apple: settings.pay_apple_enabled,
      google: settings.pay_google_enabled,
      counter: settings.pay_counter_enabled,
      link: settings.pay_link_enabled,
    };
    return ALL_METHODS.filter((m) => map[m.id]);
  }, [settings]);

  const counterOnly = settings?.payment_mode === "counter";

  useEffect(() => {
    if (counterOnly) setSelected("counter");
  }, [counterOnly]);

  const confirm = async () => {
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
            order_type: orderType === "here" ? "dine_in" : "takeaway",
            table_number: tableNumber || null,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            payment_method:
              ["card", "cash", "apple_pay", "google_pay", "pix"].includes(paymentMethodDb)
                ? (paymentMethodDb as "card" | "cash" | "apple_pay" | "google_pay" | "pix")
                : null,
            source: "totem",
            subtotal: totalPrice,
            total: totalPrice,
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
            tableNumber: tableNumber || null,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            orderType,
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
            total: totalPrice,
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
    <div className="relative min-h-[100dvh] bg-secondary/20 animate-fade-in pb-[150px]">
      <ScreenHeader
        eyebrow="Paso final"
        title="Pago"
        onBack={() => setScreen("review")}
      />

      <div className="px-4 pt-4">
        {/* Total protagonista */}
        <div className="relative bg-card rounded-[28px] p-6 border border-border shadow-card overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-price/5 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">Total a pagar</p>
              <p className="text-[44px] leading-none font-black text-price mt-1.5 tabular-nums tracking-tight">
                {totalPrice.toFixed(2)}€
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{items.length} {items.length === 1 ? "ítem" : "ítems"} · Impuestos incluidos</p>
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded-xl bg-secondary/50 p-1" />
            )}
          </div>
        </div>

        {counterOnly ? (
          <div className="mt-5 bg-card rounded-[24px] border-2 border-success/40 p-5 flex items-center gap-4 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-success text-success-foreground flex items-center justify-center shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-success font-black">Modo operativo</p>
              <p className="font-black text-foreground text-[17px] mt-0.5">Pago en mostrador</p>
              <p className="text-xs text-muted-foreground mt-0.5">Realizarás el pago al recoger tu pedido.</p>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground px-1 mb-2">Elige tu método</p>
            <div className="flex flex-col gap-2">
              {enabledMethods.map((pm) => {
                const isSel = selected === pm.id;
                const isCounter = pm.id === "counter";
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
                        <p className="font-black text-foreground text-[15px]">{pm.label}</p>
                        {isCounter && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/20 text-accent-foreground">
                            Operativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{pm.subtitle}</p>
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

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <button
          onClick={confirm}
          disabled={!selected || processing}
          className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-[26px] shadow-cta active:scale-[0.98] transition-transform touch-action-manipulation disabled:opacity-40 disabled:shadow-none"
        >
          <span className="text-[15px] font-black tracking-wide uppercase flex items-center gap-2">
            {processing ? "Procesando..." : selected === "counter" ? "Confirmar pedido" : "Confirmar pago"}
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
