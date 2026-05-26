import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { supabase } from "@/integrations/supabase/client";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";

type OrderOption = {
  key: "here" | "takeaway" | "delivery";
  label: string;
  sub: string;
  icon: string | null | undefined;
  Fallback: typeof UtensilsCrossed;
  cardClass: string;
};

const OrderTypeScreen = () => {
  const { setScreen, setTableNumber, mesaLocked, tableNumber, clearMesaLock } = useOrder();
  const { setOrderType } = useCart();
  const { settings, loading: brandingLoading } = useBranding();
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const { storeId } = useResolvedStore();
  const isDark = theme === "dark";

  const logo =
    (isDark && ((settings as any)?.logo_order_type_dark_url || (settings as any)?.logo_main_dark_url)) ||
    (settings as any)?.logo_order_type_url ||
    settings?.logo_main_url ||
    null;
  const iconDineIn = settings?.icon_dine_in_url;
  const iconTakeaway = settings?.icon_takeaway_url;
  const iconDelivery = (settings as any)?.icon_delivery_url;
  const brandName = settings?.company_name || "";

  const [opts, setOpts] = useState<{ dine_in: boolean; takeaway: boolean; delivery: boolean }>({
    dine_in: true,
    takeaway: true,
    delivery: false,
  });

  useEffect(() => {
    if (!shouldForceDeliveryOnly()) return;
    setOrderType("delivery");
    setTableNumber("");
    setScreen("home");
  }, [setOrderType, setScreen, setTableNumber]);

  useEffect(() => {
    if (!storeId) return;
    supabase
      .from("totem_config")
      .select("enable_dine_in,enable_takeaway,enable_delivery")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOpts({
            dine_in: data.enable_dine_in ?? true,
            takeaway: data.enable_takeaway ?? true,
            delivery: (data as any).enable_delivery ?? false,
          });
        }
      });
  }, [storeId]);

  const handleSelect = (type: "here" | "takeaway" | "delivery") => {
    setOrderType(type);
    if (type !== "here") {
      setTableNumber("");
      clearMesaLock();
    }
    setScreen("home");
  };

  const enabled: OrderOption[] = [];
  if (opts.dine_in && mesaLocked) {
    enabled.push({
      key: "here",
      label: t("eatHere"),
      sub: t("eatHereSub"),
      icon: iconDineIn,
      Fallback: UtensilsCrossed,
      cardClass: "bg-primary text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.55)]",
    });
  }
  if (opts.takeaway) {
    enabled.push({
      key: "takeaway",
      label: t("takeaway"),
      sub: t("takeawaySub"),
      icon: iconTakeaway,
      Fallback: ShoppingBag,
      cardClass: "bg-primary text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.55)]",
    });
  }
  if (opts.delivery) {
    enabled.push({
      key: "delivery",
      label: t("delivery"),
      sub: t("deliverySub"),
      icon: iconDelivery,
      Fallback: Bike,
      cardClass: "bg-primary text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.55)]",
    });
  }

  const premiumLayout = enabled.length <= 2;

  const renderOptionIcon = (option: OrderOption, large: boolean) => {
    const box = large ? "w-[58%] aspect-square" : "w-14 h-14 sm:w-16 sm:h-16";
    const fallbackSize = large ? "w-16 h-16" : "w-7 h-7";
    return (
      <div className={`${box} flex items-center justify-center shrink-0`}>
        {option.icon ? (
          <img
            src={option.icon}
            alt={option.label}
            className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
            draggable={false}
          />
        ) : (
          <option.Fallback className={fallbackSize} strokeWidth={2.2} />
        )}
      </div>
    );
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-header pointer-events-none z-0"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center px-6 pt-3 shrink-0">
        {!brandingLoading && logo && (
          <div className="w-full max-w-[200px] aspect-square flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <img src={logo} alt={brandName} className="w-full h-full object-contain" draggable={false} />
          </div>
        )}

        <div className="text-center flex flex-col gap-1 w-full mt-1">
          {mesaLocked && tableNumber && (
            <div className="mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-md mx-auto">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-base font-black">Mesa {tableNumber}</span>
            </div>
          )}
          {!mesaLocked && opts.dine_in && (
            <p className="text-xs text-muted-foreground mb-1 px-2">
              Para pedir na mesa, escaneie o QR code da sua mesa.
            </p>
          )}
          <h1 className="text-[24px] leading-tight font-black text-foreground tracking-tight">{t("howOrder")}</h1>
          <p className="text-[16px] text-muted-foreground">{t("pickOption")}</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 pt-2 pb-1 w-full flex-1 min-h-0">
        {enabled.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Nenhuma opção de pedido ativa.</p>
        ) : premiumLayout ? (
          <div
            className="flex flex-row items-stretch justify-center w-full max-w-lg flex-nowrap"
            style={{ gap: enabled.length === 1 ? 0 : "1.5rem" }}
          >
            {enabled.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSelect(option.key)}
                className={`flex-1 min-w-0 max-w-[200px] aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-[32px] active:scale-95 transition-transform touch-action-manipulation ${option.cardClass} ${
                  mesaLocked && option.key === "here" ? "ring-4 ring-primary-foreground/30" : ""
                }`}
              >
                {renderOptionIcon(option, true)}
                <div className="text-center px-2 w-full">
                  <span className="text-lg font-black block leading-tight">{option.label}</span>
                  <span className="text-xs opacity-90 mt-1 block leading-snug">{option.sub}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-row items-stretch justify-center w-full max-w-lg flex-nowrap overflow-x-auto no-scrollbar"
            style={{ gap: "0.75rem" }}
          >
            {enabled.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSelect(option.key)}
                className={`flex-1 min-w-[100px] max-w-[140px] shrink-0 flex flex-col items-center gap-2 p-3 bg-card rounded-[28px] shadow-[0_8px_24px_-10px_rgba(0,0,0,0.22)] border active:scale-[0.97] transition-all touch-action-manipulation ${
                  mesaLocked && option.key === "here" ? "border-primary ring-2 ring-primary/40" : "border-border/60"
                }`}
              >
                {renderOptionIcon(option, false)}
                <div className="text-center w-full">
                  <span className="text-sm font-black text-foreground block leading-tight">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block line-clamp-2 leading-snug">{option.sub}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="shrink-0 px-6 pt-2 space-y-2"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <InstallAppButton lang={lang} />
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold pb-1">
          Desenvolvido por Euro Business Group
        </p>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
