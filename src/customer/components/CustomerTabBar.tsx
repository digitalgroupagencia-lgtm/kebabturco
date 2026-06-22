import { ChevronRight, ClipboardList, Home, Loader2, Package, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/customer/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrder } from "@/customer/active-order/useActiveOrder";
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
      className="customer-tab-bar relative z-50 shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-md shadow-[0_-4px_16px_-14px_rgba(0,0,0,0.14)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("navHome")}
    >
      {showActiveOrderBanner && (
        <div className="px-3 pt-1">
          <button
            type="button"
            onClick={trackOrder}
            className="flex h-9 w-full touch-manipulation items-center gap-2 rounded-xl bg-gradient-primary px-2.5 text-primary-foreground shadow-primary transition-transform active:scale-[0.98]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              {isLoadingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[9px] font-bold uppercase tracking-wider opacity-85">
                {t("viewOrderStatus")}
              </span>
              <span className="block truncate text-xs font-black">
                #{displayNumber}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
          </button>
        </div>
      )}

      <div className="flex min-h-[58px] items-center justify-around px-1 py-2">
        {tabs.map(({ id, label, icon: Icon, onClick }) => {
          const active = activeTab === id;
          const showCartBadge = id === "cart" && totalItems > 0 && !active;

          return (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 touch-manipulation"
              aria-current={active ? "page" : undefined}
              aria-label={label}
            >
              <span
                className={`relative flex items-center justify-center rounded-full transition-all ${
                  active
                    ? "h-9 w-9 bg-gradient-primary text-primary-foreground shadow-primary"
                    : "h-8 w-8 text-muted-foreground"
                }`}
              >
                <Icon className={`${active ? "h-5 w-5" : "h-[18px] w-[18px]"}`} strokeWidth={active ? 2.25 : 2} />
                {showCartBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[7px] font-black text-primary-foreground">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </span>
              <span
                className={`max-w-[72px] truncate text-[9px] font-bold leading-none ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CustomerTabBar;
