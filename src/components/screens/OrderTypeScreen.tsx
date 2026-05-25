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
    dine_in: true, takeaway: true, delivery: false,
  });

  useEffect(() => {
    if (!shouldForceDeliveryOnly()) return;
    setOrderType("delivery");
    setTableNumber("");
    setScreen("home");
  }, [setOrderType, setScreen, setTableNumber]);

  useEffect(() => {
    if (!storeId) return;
    supabase.from("totem_config").select("enable_dine_in,enable_takeaway,enable_delivery")
      .eq("store_id", storeId).maybeSingle()
      .then(({ data }) => {
        if (data) setOpts({
          dine_in: data.enable_dine_in ?? true,
          takeaway: data.enable_takeaway ?? true,
          delivery: (data as any).enable_delivery ?? false,
        });
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

  const enabled: Array<{ key: "here" | "takeaway" | "delivery"; label: string; sub: string; icon: string | null | undefined; Fallback: any; tint: string }> = [];
  if (opts.dine_in && mesaLocked) enabled.push({ key: "here", label: t("eatHere"), sub: t("eatHereSub"), icon: iconDineIn, Fallback: UtensilsCrossed, tint: "bg-primary/10 text-primary" });
  if (opts.takeaway) enabled.push({ key: "takeaway", label: t("takeaway"), sub: t("takeawaySub"), icon: iconTakeaway, Fallback: ShoppingBag, tint: "bg-accent/20 text-accent-foreground" });
  if (opts.delivery) enabled.push({ key: "delivery", label: t("delivery"), sub: t("deliverySub"), icon: iconDelivery, Fallback: Bike, tint: "bg-success/15 text-success" });

  return (
    <div
      className="h-[100dvh] flex flex-col bg-background animate-fade-in relative overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-header pointer-events-none z-0"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center px-4 pt-3 pb-2 gap-3">
        {!brandingLoading && logo && (
          <div className="w-full max-w-[140px] aspect-square flex items-center justify-center shrink-0 drop-shadow-[0_6px_18px_rgba(0,0,0,0.15)]">
            <img src={logo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}

        <div className="text-center shrink-0 px-2">
          {mesaLocked && tableNumber && (
            <div className="mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-md">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-base font-black">Mesa {tableNumber}</span>
            </div>
          )}
          {!mesaLocked && opts.dine_in && (
            <p className="text-xs text-muted-foreground mb-2 px-2">
              Para pedir na mesa, escaneie o QR code da sua mesa.
            </p>
          )}
          <h1 className="text-[20px] leading-tight font-black text-foreground tracking-tight">
            {t("howOrder")}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">{t("pickOption")}</p>
        </div>

        <div className="w-full max-w-md shrink-0 flex-1 min-h-0 flex items-center">
          <div
            className="flex flex-row items-stretch justify-start w-full overflow-x-auto no-scrollbar px-1"
            style={{ gap: enabled.length >= 3 ? "0.5rem" : "0.75rem" }}
          >
            {enabled.map(({ key, label, sub, icon, Fallback, tint }) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-[30%] min-w-[96px] max-w-[112px] shrink-0 flex flex-col items-center gap-1.5 p-2 bg-card rounded-2xl shadow-[0_6px_18px_-10px_rgba(0,0,0,0.2)] border active:scale-[0.97] transition-all touch-action-manipulation ${
                  mesaLocked && key === "here" ? "border-primary ring-2 ring-primary/40" : "border-border/60"
                }`}
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${icon ? "" : tint}`}>
                  {icon ? (
                    <img src={icon} alt={label} className="w-full h-full object-contain" />
                  ) : (
                    <Fallback className="w-7 h-7" strokeWidth={2.2} />
                  )}
                </div>
                <div className="text-center w-full">
                  <span className="text-xs font-black text-foreground block leading-tight truncate">{label}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block line-clamp-2 leading-snug">{sub}</span>
                </div>
              </button>
            ))}
            {enabled.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Nenhuma opção de pedido ativa.</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-4 pt-2 space-y-2"
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
