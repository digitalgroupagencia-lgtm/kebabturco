import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";

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
      <h2 className="text-2xl font-black text-foreground mb-2 text-center">{t("whereEat")}</h2>
      <p className="text-muted-foreground mb-10 text-center text-sm">Selecione uma opção para continuar</p>
      
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => handleSelect("here")}
          className="flex items-center gap-5 p-6 bg-card rounded-2xl shadow-card border border-border active:scale-[0.97] transition-transform touch-action-manipulation"
        >
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-7 h-7 text-primary" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold text-foreground block">{t("eatHere")}</span>
            <span className="text-sm text-muted-foreground">Sentar e comer no restaurante</span>
          </div>
        </button>
        <button
          onClick={() => handleSelect("takeaway")}
          className="flex items-center gap-5 p-6 bg-card rounded-2xl shadow-card border border-border active:scale-[0.97] transition-transform touch-action-manipulation"
        >
          <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-7 h-7 text-accent-foreground" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold text-foreground block">{t("takeaway")}</span>
            <span className="text-sm text-muted-foreground">Levar para viagem</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
