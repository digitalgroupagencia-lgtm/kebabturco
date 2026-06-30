import { ChevronRight, Loader2, Package, ShoppingCart } from "lucide-react";
import { useCart } from "@/customer/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrder } from "@/customer/active-order/useActiveOrder";
import { ACTIVE_ORDER_BAR_SCREENS, CART_BAR_HIDDEN_SCREENS, TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";

/**
 * Barra inferior do carrinho / pedido activo, dentro da moldura mobile (não fixed ao viewport).
 */
const CustomerBottomDock = () => {
  const { screen, setScreen } = useOrder();
  const { totalItems, totalPrice } = useCart();
  const { t } = useLanguage();
  const { hasActiveOrder, displayNumber, statusLabel, trackOrder, isLoadingOrder } = useActiveOrder();

  if (TAB_BAR_VISIBLE_SCREENS.has(screen)) return null;

  const showActiveOrder = hasActiveOrder && ACTIVE_ORDER_BAR_SCREENS.has(screen);
  const showCart = totalItems > 0 && !CART_BAR_HIDDEN_SCREENS.has(screen);

  if (!showActiveOrder && !showCart) return null;

  return (
    <div className="customer-bottom-dock-wrap shrink-0 bg-background">
      <div className="customer-bottom-dock relative z-50 border-t border-border/50 px-3 pt-2">
      <div className="mx-auto flex w-full max-w-md flex-col gap-2">
        {showActiveOrder && (
          <button
            type="button"
            onClick={trackOrder}
            className="flex h-[56px] w-full touch-manipulation items-center gap-3 rounded-full bg-gradient-primary px-4 text-primary-foreground shadow-primary transition-transform active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              {isLoadingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[10px] font-bold uppercase tracking-wider opacity-85">
                {t("viewOrderStatus")}
              </span>
              <span className="block truncate text-sm font-black">
                #{displayNumber}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
          </button>
        )}

        {showCart && (
          <div className="flex h-[56px] items-center justify-between rounded-full bg-foreground pl-5 pr-2 text-background shadow-lg">
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingCart className="h-5 w-5 shrink-0" />
              <span className="truncate text-sm font-bold">
                {totalItems} {totalItems === 1 ? t("oneItem") : t("items")}
              </span>
              <span className="text-sm opacity-70">|</span>
              <span className="text-base font-black tabular-nums">{totalPrice.toFixed(2)}€</span>
            </div>
            <button
              type="button"
              onClick={() => setScreen("review")}
              className="h-[44px] shrink-0 touch-manipulation rounded-full bg-success px-4 text-sm font-black text-success-foreground shadow-md transition-transform active:scale-95"
            >
              {t("finishOrder")}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CustomerBottomDock;
