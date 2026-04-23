import { useEffect } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { CheckCircle, Clock, RotateCcw, Hash, Store, Utensils, ShoppingBag, User, Phone } from "lucide-react";

const ConfirmationScreen = () => {
  const {
    setScreen, orderNumber, tableNumber, paymentMethod,
    customerName, customerPhone, setTableNumber, setPaymentMethod,
    setCustomerName, setCustomerPhone,
  } = useOrder();
  const { orderType } = useCart();
  const { settings } = useOperationsSettings();

  const isCounter = paymentMethod === "counter";
  const isHere = orderType === "here";
  const prepMin = (settings as any)?.avg_prep_minutes ?? 12;

  const message = isCounter
    ? settings?.msg_counter || "Pago pendiente en mostrador"
    : settings?.msg_paid || "Pago confirmado";

  const handleNewOrder = () => {
    setTableNumber("");
    setPaymentMethod(null);
    setCustomerName("");
    setCustomerPhone("");
    setScreen("orderType");
  };

  // Auto reset após 30s
  useEffect(() => {
    const t = setTimeout(handleNewOrder, 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-secondary/20 animate-fade-in">
      <header className="relative bg-gradient-header text-primary-foreground py-10 px-6 text-center shadow-header rounded-b-[28px] overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-black/15 blur-3xl" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 ring-4 ring-white/10">
            <CheckCircle className="w-12 h-12 text-success-foreground" strokeWidth={2.2} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] opacity-80 font-bold">Confirmado</p>
          <h1 className="text-[26px] font-black tracking-tight mt-1">¡Pedido recibido!</h1>
          <p className="opacity-85 mt-1 text-sm">Estamos preparando tu pedido</p>
        </div>
      </header>

      <div className="flex-1 px-5 pt-6 pb-6 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Número protagonista */}
        <div className="relative bg-card border border-border rounded-[28px] p-6 text-center shadow-card overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-bold">Tu número</p>
          <p className="text-[104px] leading-none font-black text-primary mt-2 tabular-nums tracking-tighter">
            #{orderNumber}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-semibold">
            Muestra este número al recoger tu pedido
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {customerName && (
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Cliente</p>
                <p className="font-black text-foreground truncate">{customerName}</p>
              </div>
            </div>
          )}

          {!isHere && customerPhone && (
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Telefone</p>
                <p className="font-black text-foreground tabular-nums">{customerPhone}</p>
              </div>
            </div>
          )}

          {isHere && tableNumber && (
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Hash className="w-5 h-5" strokeWidth={2.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Mesa</p>
                <p className="font-black text-foreground text-2xl tabular-nums leading-none mt-0.5">{tableNumber}</p>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              {isHere ? <Utensils className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Modalidad</p>
              <p className="font-black text-foreground">{isHere ? "Comer aquí" : "Para llevar"}</p>
            </div>
          </div>

          <div className={`rounded-2xl p-4 flex items-center gap-3 border-2 shadow-card ${
            isCounter ? "bg-accent/10 border-accent" : "bg-success/10 border-success"
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isCounter ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground"
            }`}>
              {isCounter ? <Store className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Estado de pago</p>
              <p className="font-black text-foreground text-[15px]">{message}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Tiempo estimado</p>
              <p className="font-black text-foreground tabular-nums">~ {prepMin} minutos</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNewOrder}
          className="mt-auto flex items-center justify-center gap-2.5 px-6 py-5 bg-gradient-cta text-success-foreground rounded-[26px] text-[15px] font-black active:scale-[0.98] transition-transform touch-action-manipulation shadow-cta uppercase tracking-wide"
        >
          <RotateCcw className="w-5 h-5" strokeWidth={3} />
          Nuevo pedido
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
