import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";

const OrderTypeScreen = () => {
  const { setScreen, setTableNumber } = useOrder();
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
    if (type !== "here") setTableNumber("");
    setScreen("home");
  };

  const enabled: Array<{ key: "here" | "takeaway" | "delivery"; label: string; sub: string; icon: string | null | undefined; Fallback: any; tint: string }> = [];
  if (opts.dine_in) enabled.push({ key: "here", label: t("eatHere"), sub: t("eatHereSub"), icon: iconDineIn, Fallback: UtensilsCrossed, tint: "bg-primary/10 text-primary" });
  if (opts.takeaway) enabled.push({ key: "takeaway", label: t("takeaway"), sub: t("takeawaySub"), icon: iconTakeaway, Fallback: ShoppingBag, tint: "bg-accent/20 text-accent-foreground" });
  if (opts.delivery) enabled.push({ key: "delivery", label: "A domicilio", sub: "Entrega en tu dirección", icon: iconDelivery, Fallback: Bike, tint: "bg-success/15 text-success" });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative">
      <div className="absolute top-4 right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center pt-10 pb-6 px-6 min-h-[200px]">
        {!brandingLoading && logo && (
          <div className="w-full max-w-[240px] aspect-[4/3] flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <img src={logo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      <div className="px-6 text-center">
        <h1 className="text-[24px] leading-tight font-black text-foreground tracking-tight">
          {t("howOrder")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("pickOption")}</p>
      </div>

      {/* Layout horizontal — todos os tipos ativos lado a lado */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 w-full">
        <div
          className="flex flex-row items-stretch justify-center w-full max-w-md flex-nowrap"
          style={{ gap: enabled.length >= 3 ? "0.75rem" : "1rem" }}
        >
          {enabled.map(({ key, label, sub, icon, Fallback, tint }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="flex-1 min-w-0 flex flex-col items-center gap-2 p-3 bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border border-border/60 active:scale-[0.97] transition-all touch-action-manipulation"
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 overflow-hidden ${tint}`}>
                {icon ? (
                  <img src={icon} alt={label} className="w-full h-full object-cover rounded-3xl" />
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
        <InstallAppButton lang={(useLanguage() as any).lang} />
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          {brandName || "\u00A0"}
        </p>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
