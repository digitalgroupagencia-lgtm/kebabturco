import { ChevronRight, ClipboardList, Home, Loader2, Package, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrder } from "@/features/customer/useActiveOrder";
import { TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";

type TabId = "home" | "orders" | "cart" | "account";

const CustomerTabBar = () => {
  const { screen, setScreen, accountFocus, setAccountFocus } = useOrder();
  const { totalItems } = useCart();
  const { t } = useLanguage();
  const { hasActiveOrder, displayNumber, statusLabel, trackOrder, isLoadingOrder } = useActiveOrder();

  if (!TAB_BAR_VISIBLE_SCREENS.has(screen)) return null;

  const activeTab: TabId = (() => {
    if (screen === "home") return "home";
    if (screen === "review") return "cart";
    if (screen === "tracking") return "orders";
    if (screen === "account") return accountFocus === "profile" ? "account" : "orders";
    return "home";
  })();

  const goHome = () => setScreen("home");

  const goOrders = () => {
    if (hasActiveOrder) {
      trackOrder();
      return;
    }
    setAccountFocus("orders");
    setScreen("account");
  };

  const goCart = () => setScreen("review");

  const goAccount = () => {
    setAccountFocus("profile");
    setScreen("account");
  };

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: typeof Home;
    onClick: () => void;
  }> = [
    { id: "home", label: t("navHome"), icon: Home, onClick: goHome },
    { id: "orders", label: t("navOrders"), icon: ClipboardList, onClick: goOrders },
    { id: "cart", label: t("navCart"), icon: ShoppingCart, onClick: goCart },
    { id: "account", label: t("navAccount"), icon: User, onClick: goAccount },
  ];

  const showActiveOrderBanner = screen === "home" && hasActiveOrder;

  return (
    <nav
      className="customer-tab-bar relative z-50 shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-md shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      aria-label={t("navHome")}
    >
      {showActiveOrderBanner && (
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={trackOrder}
            className="flex h-12 w-full touch-manipulation items-center gap-3 rounded-2xl bg-gradient-primary px-3 text-primary-foreground shadow-primary transition-transform active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
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
        </div>
      )}

      <div className="flex items-end justify-around px-2 pt-1.5">
        {tabs.map(({ id, label, icon: Icon, onClick }) => {
          const active = activeTab === id;
          const showCartBadge = id === "cart" && totalItems > 0 && !active;

          return (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-end touch-manipulation pb-0.5"
              aria-current={active ? "page" : undefined}
              aria-label={label}
            >
              {active ? (
                <span className="flex min-w-[68px] flex-col items-center rounded-full bg-gradient-primary px-4 py-2 shadow-primary">
                  <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.25} />
                  <span className="mt-0.5 text-[10px] font-bold leading-tight text-primary-foreground">{label}</span>
                </span>
              ) : (
                <>
                  <span className="relative flex h-8 w-8 items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                    {showCartBadge && (
                      <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">
                        {totalItems > 99 ? "99+" : totalItems}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold leading-tight text-muted-foreground">{label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CustomerTabBar;
