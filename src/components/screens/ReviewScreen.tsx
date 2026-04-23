import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QuantitySelector from "@/components/QuantitySelector";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";

const ReviewScreen = () => {
  const { setScreen } = useOrder();
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { tProduct } = useLanguage();

  return (
    <div className="relative min-h-[100dvh] bg-secondary/30 animate-fade-in pb-[160px]">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setScreen("home")} className="active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black">Revisão do pedido</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-2xl shadow-sm p-4 border border-border">
            <div className="flex gap-3">
              {item.productImage ? (
                <img src={item.productImage} alt={tProduct(item.productName)} className="w-16 h-16 object-contain rounded-xl" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-muted-foreground">
                    {tProduct(item.productName).charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm">{tProduct(item.productName)}</h3>
                {item.sizeName && (
                  <p className="text-xs text-muted-foreground">{tProduct(item.sizeName)}</p>
                )}
                {item.extras.map(e => (
                  <p key={e.id} className="text-xs text-muted-foreground">
                    +{e.quantity}x {tProduct(e.name)}
                  </p>
                ))}
                {item.removedIngredients.length > 0 && (
                  <p className="text-xs text-destructive">
                    Sem: {item.removedIngredients.join(", ")}
                  </p>
                )}
                <p className="text-base font-black text-primary mt-1">R$ {item.totalPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <button
                onClick={() => removeItem(item.id)}
                className="flex items-center gap-1 text-destructive text-sm font-bold active:opacity-70"
              >
                <Trash2 className="w-4 h-4" /> Remover
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
            <span className="text-base">Carrinho vazio</span>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-muted-foreground">Total</span>
            <span className="text-xl font-black text-primary">R$ {totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setScreen("payment")}
            className="w-full flex items-center justify-center py-4 px-5 bg-success text-success-foreground rounded-full shadow-lg text-base font-black tracking-wide active:scale-[0.97] transition-transform touch-action-manipulation"
          >
            Ir para pagamento
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
