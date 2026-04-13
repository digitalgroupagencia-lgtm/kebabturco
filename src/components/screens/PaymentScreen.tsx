import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { ArrowLeft, CreditCard, Banknote, Smartphone, QrCode } from "lucide-react";

const paymentMethods = [
  { id: "card", icon: CreditCard, label: "Cartão" },
  { id: "cash", icon: Banknote, label: "Dinheiro" },
  { id: "pix", icon: QrCode, label: "Pix" },
  { id: "apple", icon: Smartphone, label: "Apple Pay" },
  { id: "google", icon: Smartphone, label: "Google Pay" },
];

const PaymentScreen = () => {
  const { setScreen, generateOrderNumber } = useOrder();
  const { totalPrice, clearCart } = useCart();
  const [selected, setSelected] = useState<string | null>(null);

  const handlePay = () => {
    generateOrderNumber();
    clearCart();
    setScreen("confirmation");
  };

  return (
    <div className="min-h-[100dvh] bg-background animate-fade-in pb-[100px]">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setScreen("review")} className="active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black">Pagamento</h1>
      </div>

      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm">Total a pagar</p>
          <p className="text-4xl font-black text-primary mt-1">R$ {totalPrice.toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {paymentMethods.map(pm => (
            <button
              key={pm.id}
              onClick={() => setSelected(pm.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.97] touch-action-manipulation ${
                selected === pm.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <pm.icon className="w-6 h-6" />
              <span className="text-base font-bold">{pm.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border p-4">
        <button
          onClick={handlePay}
          disabled={!selected}
          className="w-full max-w-md mx-auto py-4 bg-success text-success-foreground rounded-2xl text-base font-black active:scale-[0.97] transition-transform touch-action-manipulation disabled:opacity-40"
        >
          Pagar agora · R$ {totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
