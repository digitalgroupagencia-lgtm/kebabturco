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
  if (opts.dine_in) enabled.push({ key: "here", label: t("eatHere"), sub: t("eatHereSub"), icon: iconDineIn, Fallback: UtensilsCrossed, tint: "bg-primary/10 text-primary" });
  if (opts.takeaway) enabled.push({ key: "takeaway", label: t("takeaway"), sub: t("takeawaySub"), icon: iconTakeaway, Fallback: ShoppingBag, tint: "bg-accent/20 text-accent-foreground" });
  if (opts.delivery) enabled.push({ key: "delivery", label: t("delivery"), sub: t("deliverySub"), icon: iconDelivery, Fallback: Bike, tint: "bg-success/15 text-success" });

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Faixa de status bar na cor da marca */}
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-header pointer-events-none z-0"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      {/* Bloco central: logo + título */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-4 gap-6">
        {!brandingLoading && logo && (
          <div className="w-full max-w-[280px] aspect-square flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <img src={logo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}

        <div className="text-center">
          {mesaLocked && tableNumber && (
            <div className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg">
              <UtensilsCrossed className="w-5 h-5" />
              <span className="text-lg font-black">Mesa {tableNumber}</span>
            </div>
          )}
          <h1 className="text-[24px] leading-tight font-black text-foreground tracking-tight">
            {t("howOrder")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("pickOption")}</p>
        </div>
      </div>

      {/* Layout horizontal — todos os tipos ativos lado a lado */}
      <div className="flex items-center justify-center px-4 pb-4 w-full">
        <div
          className="flex flex-row items-stretch justify-center w-full max-w-md flex-nowrap"
          style={{ gap: enabled.length >= 3 ? "0.75rem" : "1rem" }}
        >
          {enabled.map(({ key, label, sub, icon, Fallback, tint }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-2 p-3 bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border active:scale-[0.97] transition-all touch-action-manipulation ${
                mesaLocked && key === "here" ? "border-primary ring-2 ring-primary/40" : "border-border/60"
              }`}
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 ${icon ? "" : tint}`}>
                {icon ? (
                  <img src={icon} alt={label} className="w-full h-full object-contain" />
                ) : (
                  <Fallback className="w-9 h-9" strokeWidth={2.2} />
                )}
              </div>
              <div className="text-center w-full">
                <span className="text-sm font-black text-foreground block leading-tight truncate">{label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block line-clamp-2">{sub}</span>
              </div>
            </button>
          ))}
          {enabled.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">Nenhuma opção de pedido ativa.</p>
          )}
        </div>
      </div>

      <div className="pb-6 px-6 space-y-3">
        <InstallAppButton lang={lang} />
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          {brandName || "\u00A0"}
        </p>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
