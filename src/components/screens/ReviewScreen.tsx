import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QuantitySelector from "@/components/QuantitySelector";
import { ArrowLeft, Trash2, ShoppingCart, Hash } from "lucide-react";

const ReviewScreen = () => {
  const { setScreen, tableNumber, setTableNumber } = useOrder();
  const { items, updateQuantity, removeItem, totalPrice, orderType } = useCart();
  const { tProduct } = useLanguage();
  const requiresTable = orderType === "here";
  const tableValid = !requiresTable || tableNumber.trim().length > 0;

  return (
    <div className="relative min-h-[100dvh] bg-secondary/30 animate-fade-in pb-[160px]">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => setScreen("home")} className="active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black">Revisão do pedido</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {requiresTable && (
          <div className="bg-card rounded-2xl shadow-sm p-4 border border-border">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
              <Hash className="w-4 h-4 text-primary" />
              Número de mesa <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Ej: 12"
              className="w-full h-12 px-4 text-lg font-bold text-foreground bg-secondary/60 rounded-xl border border-border focus:outline-none focus:border-primary focus:bg-card"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Indica el número de tu mesa para que te llevemos el pedido.
            </p>
          </div>
        )}

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
                <p className="text-base font-black text-price mt-1 tabular-nums">{item.totalPrice.toFixed(2)}€</p>
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
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-2xl font-black text-price tabular-nums">{totalPrice.toFixed(2)}€</span>
          </div>
          <button
            onClick={() => tableValid && setScreen("payment")}
            disabled={!tableValid}
            className="w-full flex items-center justify-center py-4 px-5 bg-gradient-cta text-success-foreground rounded-2xl shadow-cta text-[15px] font-black tracking-wide uppercase active:scale-[0.98] transition-transform touch-action-manipulation disabled:opacity-50 disabled:active:scale-100"
          >
            {tableValid ? "Ir al pago" : "Indica el número de mesa"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
