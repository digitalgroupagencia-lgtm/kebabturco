import { useOrder } from "@/contexts/OrderContext";
import { CheckCircle, Clock, RotateCcw } from "lucide-react";

const ConfirmationScreen = () => {
  const { setScreen, orderNumber } = useOrder();

  const handleNewOrder = () => {
    setScreen("orderType");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-6 animate-scale-in text-center">
      <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-12 h-12 text-success-foreground" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-1">Pedido confirmado!</h1>
      <p className="text-muted-foreground mb-6 text-sm">Seu pedido está sendo preparado</p>
      <div className="text-6xl font-black text-primary mb-6">#{orderNumber}</div>
      <div className="bg-secondary/50 rounded-2xl p-4 mb-8 flex items-center gap-3">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <p className="text-foreground font-semibold text-sm">Tempo estimado: 5-8 minutos</p>
      </div>
      <button
        onClick={handleNewOrder}
        className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-base font-black active:scale-95 transition-transform touch-action-manipulation"
      >
        <RotateCcw className="w-5 h-5" />
        Novo pedido
      </button>
    </div>
  );
};

export default ConfirmationScreen;
