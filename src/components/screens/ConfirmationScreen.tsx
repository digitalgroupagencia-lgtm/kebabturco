import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle } from "lucide-react";

const ConfirmationScreen = () => {
  const { setScreen, orderNumber } = useOrder();
  const { t } = useLanguage();

  const handleNewOrder = () => {
    setScreen("splash");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 animate-scale-in text-center">
      <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-14 h-14 text-success-foreground" />
      </div>
      <h1 className="text-3xl font-black text-foreground mb-2">{t("orderConfirmed")}</h1>
      <p className="text-muted-foreground mb-6">{t("orderNumber")}</p>
      <div className="text-6xl font-black text-primary mb-6">#{orderNumber}</div>
      <div className="bg-secondary rounded-2xl p-4 mb-8">
        <p className="text-foreground font-bold">⏱️ {t("estimatedTime")}: 5-8 {t("minutes")}</p>
      </div>
      <button
        onClick={handleNewOrder}
        className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-lg font-black active:scale-95 transition-transform touch-action-manipulation"
      >
        {t("newOrder")}
      </button>
    </div>
  );
};

export default ConfirmationScreen;
