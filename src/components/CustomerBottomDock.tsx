import { ChevronRight, Loader2, Package, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrder } from "@/features/customer/useActiveOrder";
import { ACTIVE_ORDER_BAR_SCREENS, CART_BAR_HIDDEN_SCREENS } from "@/lib/customerBottomBars";

const TRACK_LABEL = {
  pt: "Ver estado do pedido",
  en: "View order status",
  es: "Ver estado del pedido",
  fr: "Voir le statut",
};

/**
 * Barra fixa em baixo — pedido activo (prioridade) e carrinho.
 * Evita sobrepor bandeiras de idioma e ícones nos ecrãs iniciais.
 */
const CustomerBottomDock = () => {
  const { screen, setScreen } = useOrder();
  const { totalItems, totalPrice } = useCart();
  const { t, lang } = useLanguage();
  const { hasActiveOrder, displayNumber, statusLabel, trackOrder, isLoadingOrder } = useActiveOrder();

  const showActiveOrder = hasActiveOrder && ACTIVE_ORDER_BAR_SCREENS.has(screen);
  const showCart = totalItems > 0 && !CART_BAR_HIDDEN_SCREENS.has(screen);

  if (!showActiveOrder && !showCart) return null;

  const trackCta = TRACK_LABEL[lang] || TRACK_LABEL.es;

  return (
    <div
      className="fixed left-0 right-0 z-50 pointer-events-none"
      style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="max-w-md mx-auto px-3 flex flex-col gap-2 pointer-events-auto"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {showActiveOrder && (
          <button
            type="button"
            onClick={trackOrder}
            className="w-full flex items-center gap-3 px-4 h-[56px] rounded-full bg-primary text-primary-foreground shadow-2xl active:scale-[0.98] transition-transform touch-action-manipulation"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-foreground/15 shrink-0">
              {isLoadingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider opacity-85 truncate">
                {trackCta}
              </span>
              <span className="block font-black text-sm truncate">
                #{displayNumber}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
          </button>
        )}

        {showCart && (
          <div className="flex items-center justify-between bg-foreground text-background rounded-full pl-5 pr-2 h-[56px] shadow-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <span className="font-bold text-sm truncate">
                {totalItems} {totalItems === 1 ? "item" : t("items")}
              </span>
              <span className="text-sm opacity-70">|</span>
              <span className="text-base font-black tabular-nums">{totalPrice.toFixed(2)}€</span>
            </div>
            <button
              type="button"
              onClick={() => setScreen("review")}
              className="bg-success text-success-foreground px-4 h-[44px] rounded-full text-sm font-black active:scale-95 transition-transform touch-action-manipulation shadow-md shrink-0"
            >
              {t("finishOrder")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerBottomDock;
