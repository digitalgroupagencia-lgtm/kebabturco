import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, CreditCard, Banknote, Smartphone } from "lucide-react";

const paymentMethods = [
  { id: "card", icon: CreditCard, labelKey: "card" },
  { id: "cash", icon: Banknote, labelKey: "cash" },
  { id: "apple", icon: Smartphone, labelKey: "applePay" },
  { id: "google", icon: Smartphone, labelKey: "googlePay" },
];

const PaymentScreen = () => {
  const { setScreen, generateOrderNumber } = useOrder();
  const { totalPrice, clearCart } = useCart();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  const handlePay = () => {
    generateOrderNumber();
    clearCart();
    setScreen("confirmation");
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in pb-28">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setScreen("review")} className="active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black">{t("payment")}</h1>
      </div>

      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">{t("total")}</p>
          <p className="text-4xl font-black text-primary">€{totalPrice.toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-3">
          {paymentMethods.map(pm => (
            <button
              key={pm.id}
              onClick={() => setSelected(pm.id)}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all active:scale-95 touch-action-manipulation ${
                selected === pm.id
                  ? "bg-primary text-primary-foreground border-primary shadow-elevated"
                  : "bg-card text-foreground border-border shadow-card"
              }`}
            >
              <pm.icon className="w-7 h-7" />
              <span className="text-lg font-bold">{t(pm.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <button
          onClick={handlePay}
          disabled={!selected}
          className="w-full py-4 bg-success text-success-foreground rounded-2xl text-lg font-black active:scale-95 transition-transform touch-action-manipulation disabled:opacity-40"
        >
          {t("payNow")} · €{totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
