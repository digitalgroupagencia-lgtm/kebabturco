import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { UtensilsCrossed, ShoppingBag, ChevronRight } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import logoFallback from "@/assets/elrey-logo.png";

const OrderTypeScreen = () => {
  const { setScreen, setTableNumber } = useOrder();
  const { setOrderType } = useCart();
  const { settings } = useBranding();
  const { t } = useLanguage();
  const logo = (settings as any)?.logo_order_type_url || settings?.logo_main_url || logoFallback;
  const iconDineIn = settings?.icon_dine_in_url;
  const iconTakeaway = settings?.icon_takeaway_url;
  const brandName = settings?.company_name || "EL REY";

  const handleSelect = (type: "here" | "takeaway") => {
    setOrderType(type);
    if (type === "takeaway") setTableNumber("");
    setScreen("home");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative">
      {/* Toggle tema */}
      <div className="absolute top-4 right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      {/* Logo header */}
      <div className="flex flex-col items-center pt-12 pb-8 px-6">
        <div className="w-full max-w-[280px] aspect-[4/3] flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <img
            src={logo}
            alt={brandName}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-6 text-center">
        <h1 className="text-[26px] leading-tight font-black text-foreground tracking-tight">
          {t("howOrder")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("pickOption")}
        </p>
      </div>

      {/* Option cards */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8 gap-4 max-w-md w-full mx-auto">
        <button
          onClick={() => handleSelect("here")}
          className="group relative overflow-hidden flex items-center gap-4 p-5 bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border border-border/60 active:scale-[0.97] transition-all touch-action-manipulation"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {iconDineIn ? (
              <img src={iconDineIn} alt={t("eatHere")} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              <UtensilsCrossed className="w-9 h-9 text-primary" strokeWidth={2.2} />
            )}
          </div>
          <div className="text-left flex-1">
            <span className="text-lg font-black text-foreground block leading-tight">
              {t("eatHere")}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {t("eatHereSub")}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        <button
          onClick={() => handleSelect("takeaway")}
          className="group relative overflow-hidden flex items-center gap-4 p-5 bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border border-border/60 active:scale-[0.97] transition-all touch-action-manipulation"
        >
          <div className="w-20 h-20 rounded-3xl bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
            {iconTakeaway ? (
              <img src={iconTakeaway} alt={t("takeaway")} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              <ShoppingBag className="w-9 h-9 text-accent-foreground" strokeWidth={2.2} />
            )}
          </div>
          <div className="text-left flex-1">
            <span className="text-lg font-black text-foreground block leading-tight">
              {t("takeaway")}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {t("takeawaySub")}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Footer brand */}
      <div className="text-center pb-6 px-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          Pizza · Kebab · Burger
        </p>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
