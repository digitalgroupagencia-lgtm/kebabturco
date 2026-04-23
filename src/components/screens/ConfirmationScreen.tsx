import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { CheckCircle, Clock, RotateCcw, Hash, Store } from "lucide-react";

const ConfirmationScreen = () => {
  const { setScreen, orderNumber, tableNumber, paymentMethod, setTableNumber, setPaymentMethod } = useOrder();
  const { orderType } = useCart();
  const { settings } = useOperationsSettings();

  const isCounter = paymentMethod === "counter";
  const isHere = orderType === "here";

  const message = isCounter
    ? settings?.msg_counter || "Pago pendiente en mostrador"
    : settings?.msg_paid || "Pago confirmado";

  const handleNewOrder = () => {
    setTableNumber("");
    setPaymentMethod(null);
    setScreen("orderType");
  };

  // Auto reset após 30s
  useEffect(() => {
    const t = setTimeout(handleNewOrder, 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background animate-fade-in">
      <header className="bg-gradient-header text-primary-foreground py-12 px-6 text-center shadow-header rounded-b-[36px]">
        <div className="w-20 h-20 mx-auto bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 ring-4 ring-white/10">
          <CheckCircle className="w-12 h-12 text-success-foreground" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-black tracking-tight">¡Pedido confirmado!</h1>
        <p className="opacity-85 mt-1.5 text-sm">Tu pedido está en preparación</p>
      </header>

      <div className="flex-1 px-6 pt-8 pb-6 flex flex-col gap-5 max-w-md mx-auto w-full">
        <div className="bg-card border border-border rounded-3xl p-6 text-center shadow-card">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">Tu número</p>
          <p className="text-[88px] leading-none font-black text-price mt-2 tabular-nums tracking-tighter">
            #{orderNumber}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {isHere && tableNumber && (
            <div className="bg-secondary/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Mesa</p>
                <p className="font-black text-foreground text-lg">{tableNumber}</p>
              </div>
            </div>
          )}

          <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
            isCounter ? "bg-accent/10 border-accent/30" : "bg-success/10 border-success/30"
          }`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isCounter ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground"
            }`}>
              {isCounter ? <Store className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Estado de pago</p>
              <p className="font-black text-foreground">{message}</p>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-foreground/10 text-foreground flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Tiempo estimado</p>
              <p className="font-black text-foreground">5 – 8 minutos</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNewOrder}
          className="mt-auto flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-cta text-success-foreground rounded-2xl text-[15px] font-black active:scale-[0.98] transition-transform touch-action-manipulation shadow-cta uppercase tracking-wide"
        >
          <RotateCcw className="w-5 h-5" />
          Nuevo pedido
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
