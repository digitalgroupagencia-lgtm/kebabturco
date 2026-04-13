import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

const OrderTypeScreen = () => {
  const { setScreen } = useOrder();
  const { setOrderType } = useCart();
  const { t } = useLanguage();

  const handleSelect = (type: "here" | "takeaway") => {
    setOrderType(type);
    setScreen("home");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 animate-fade-in">
      <h2 className="text-3xl font-black text-foreground mb-2 text-center">{t("whereEat")}</h2>
      <div className="flex flex-col gap-4 w-full max-w-sm mt-8">
        <button
          onClick={() => handleSelect("here")}
          className="flex items-center gap-5 p-6 bg-card rounded-2xl shadow-card border border-border active:scale-95 transition-transform touch-action-manipulation"
        >
          <span className="text-5xl">🍽️</span>
          <span className="text-2xl font-bold text-foreground">{t("eatHere")}</span>
        </button>
        <button
          onClick={() => handleSelect("takeaway")}
          className="flex items-center gap-5 p-6 bg-card rounded-2xl shadow-card border border-border active:scale-95 transition-transform touch-action-manipulation"
        >
          <span className="text-5xl">🛍️</span>
          <span className="text-2xl font-bold text-foreground">{t("takeaway")}</span>
        </button>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
