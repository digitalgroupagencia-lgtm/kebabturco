import { useEffect, useMemo, useState } from "react";
import { useOrder, type PaymentMethodId } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { CreditCard, Banknote, Smartphone, QrCode, Store, Link2, Check } from "lucide-react";
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
  const { setScreen, generateOrderNumber, setPaymentMethod } = useOrder();
  const { totalPrice, clearCart } = useCart();
  const { settings } = useOperationsSettings();
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);

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

  const confirm = () => {
    if (!selected) return;
    setPaymentMethod(selected);
    generateOrderNumber();
    clearCart();
    setScreen("confirmation");
  };

  return (
    <div className="relative min-h-[100dvh] bg-background animate-fade-in pb-[140px]">
      <ScreenHeader
        eyebrow="Paso final"
        title="Pago"
        onBack={() => setScreen("review")}
      />

      <div className="px-5 pt-6">
        <div className="bg-secondary/40 rounded-3xl p-5 text-center border border-border/60">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Total a pagar</p>
          <p className="text-[42px] leading-none font-black text-price mt-2 tabular-nums tracking-tight">
            {totalPrice.toFixed(2)}€
          </p>
        </div>

        {counterOnly ? (
          <div className="mt-6 bg-success/10 border border-success/30 rounded-3xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success text-success-foreground flex items-center justify-center shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-foreground">Pago en mostrador</p>
              <p className="text-xs text-muted-foreground mt-0.5">Realizarás el pago al recoger tu pedido.</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Elige tu método</p>
            {enabledMethods.map((pm) => {
              const isSel = selected === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setSelected(pm.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] touch-action-manipulation ${
                    isSel
                      ? "bg-card border-success shadow-card"
                      : "bg-card border-border/70 hover:border-border"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSel ? "bg-success text-success-foreground" : "bg-secondary text-foreground"
                  }`}>
                    <pm.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-black text-foreground text-[15px]">{pm.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{pm.subtitle}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSel ? "bg-success border-success" : "border-border"
                  }`}>
                    {isSel && <Check className="w-3.5 h-3.5 text-success-foreground" strokeWidth={3.5} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <button
          onClick={confirm}
          disabled={!selected}
          className="w-full flex items-center justify-between gap-3 py-4 px-5 bg-gradient-cta text-success-foreground rounded-2xl shadow-cta active:scale-[0.98] transition-transform touch-action-manipulation disabled:opacity-40 disabled:shadow-none"
        >
          <span className="text-[15px] font-black tracking-wide uppercase">
            {selected === "counter" ? "Confirmar pedido" : "Confirmar pago"}
          </span>
          <span className="text-[15px] font-black bg-white/15 rounded-xl px-3 py-1 tabular-nums">
            {totalPrice.toFixed(2)}€
          </span>
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
