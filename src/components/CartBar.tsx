import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShoppingCart } from "lucide-react";

const CartBar = () => {
  const { totalItems, totalPrice } = useCart();
  const { setScreen, screen } = useOrder();
  const { t } = useLanguage();

  if (totalItems === 0 || screen === "review" || screen === "payment" || screen === "confirmation") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="max-w-md mx-auto flex items-center justify-between bg-foreground text-background px-4 h-[60px]">
        {/* Left: cart info */}
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold text-sm">
            {totalItems} {t("items")}
          </span>
        </div>

        {/* Center: total */}
        <span className="text-lg font-black">€{totalPrice.toFixed(2)}</span>

        {/* Right: CTA button */}
        <button
          onClick={() => setScreen("review")}
          className="bg-success text-success-foreground px-4 py-2 rounded-xl text-sm font-black active:scale-95 transition-transform touch-action-manipulation"
        >
          {t("finishOrder")}
        </button>
      </div>
    </div>
  );
};

export default CartBar;
