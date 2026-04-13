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
      <button
        onClick={() => setScreen("review")}
        className="w-full flex items-center justify-between bg-success text-success-foreground px-6 py-4 active:opacity-90 transition touch-action-manipulation"
      >
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold text-lg">{totalItems} {t("items")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black">€{totalPrice.toFixed(2)}</span>
          <span className="bg-success-foreground text-success px-3 py-1 rounded-full text-sm font-bold">
            {t("finishOrder")}
          </span>
        </div>
      </button>
    </div>
  );
};

export default CartBar;
