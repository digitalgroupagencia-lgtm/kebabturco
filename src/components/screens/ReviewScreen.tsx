import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QuantitySelector from "@/components/QuantitySelector";
import { ArrowLeft, Trash2 } from "lucide-react";

const ReviewScreen = () => {
  const { setScreen } = useOrder();
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { t, tProduct } = useLanguage();

  return (
    <div className="min-h-screen bg-secondary animate-fade-in pb-28">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setScreen("home")} className="active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black">{t("orderReview")}</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-2xl shadow-card p-4 border border-border">
            <div className="flex gap-3">
              <img src={item.product.image} alt={tProduct(item.product.name)} className="w-20 h-20 object-contain" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{tProduct(item.product.name)}</h3>
                {item.selectedSize && (
                  <p className="text-xs text-muted-foreground">{tProduct(item.selectedSize.name)}</p>
                )}
                {item.selectedExtras.map(e => (
                  <p key={e.extra.id} className="text-xs text-muted-foreground">
                    +{e.quantity}x {tProduct(e.extra.name)}
                  </p>
                ))}
                <p className="text-lg font-black text-primary mt-1">€{item.totalPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <button
                onClick={() => removeItem(item.id)}
                className="flex items-center gap-1 text-destructive text-sm font-bold active:opacity-70"
              >
                <Trash2 className="w-4 h-4" /> {t("remove")}
              </button>
              <QuantitySelector
                value={item.quantity}
                onChange={(v) => updateQuantity(item.id, v)}
                min={1}
              />
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-lg">
            🛒 {t("cart")} vazio
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-foreground">{t("total")}</span>
            <span className="text-2xl font-black text-primary">€{totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setScreen("payment")}
            className="w-full py-4 bg-success text-success-foreground rounded-2xl text-lg font-black active:scale-95 transition-transform touch-action-manipulation"
          >
            {t("goToPayment")}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
