import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { ShoppingCart } from "lucide-react";

const CartBar = () => {
  const { totalItems, totalPrice } = useCart();
  const { setScreen, screen } = useOrder();

  // Hide on certain screens
  if (totalItems === 0 || screen === "review" || screen === "payment" || screen === "confirmation" || screen === "product") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between bg-foreground text-background mx-3 mb-3 rounded-2xl px-4 h-[56px] shadow-lg">
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
            className="bg-success text-success-foreground px-5 py-2 rounded-xl text-sm font-black active:scale-95 transition-transform touch-action-manipulation"
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartBar;
