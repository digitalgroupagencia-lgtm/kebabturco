import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { ShoppingCart } from "lucide-react";

const CartBar = () => {
  const { totalItems, totalPrice } = useCart();
  const { setScreen, screen } = useOrder();

  // Hide on certain screens
  if (totalItems === 0 || screen === "review" || screen === "payment" || screen === "confirmation" || screen === "product") return null;

  return (
    <div
      className="sticky left-0 right-0 z-50 pointer-events-none"
      style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="max-w-md mx-auto px-3 pointer-events-auto"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between bg-foreground text-background rounded-full pl-5 pr-2 h-[60px] shadow-2xl">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold text-sm">
              {totalItems} {totalItems === 1 ? "item" : "itens"}
            </span>
            <span className="text-sm opacity-70">|</span>
            <span className="text-base font-black">R$ {totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setScreen("review")}
            className="bg-success text-success-foreground px-5 h-[44px] rounded-full text-sm font-black active:scale-95 transition-transform touch-action-manipulation shadow-md"
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartBar;
