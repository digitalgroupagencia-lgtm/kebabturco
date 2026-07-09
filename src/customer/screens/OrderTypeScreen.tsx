import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/customer/contexts/CartContext";
import { UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { supabase } from "@/integrations/supabase/client";
import { shouldForceDeliveryOnly } from "@/lib/embed-mode";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";
import { useStaffLogoGesture } from "@/hooks/useStaffLogoGesture";
import MesaSetupDialog from "@/customer/components/MesaSetupDialog";
import { STOREFRONT_FOOTER_WRAP_CLASS } from "@/lib/storefrontFooter";

type OrderOption = {
  key: "here" | "takeaway" | "delivery";
  label: string;
  sub: string;
  icon: string | null | undefined;
  Fallback: typeof UtensilsCrossed;
};

type OrderTypeCardProps = {
  option: OrderOption;
  compact: boolean;
  onSelect: () => void;
};

const OrderTypeCard = ({ option, compact, onSelect }: OrderTypeCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={`group flex flex-col items-center touch-action-manipulation active:scale-[0.97] transition-all duration-200 bg-transparent border-0 shadow-none ${
      compact ? "flex-1 min-w-0 gap-2 py-3 px-0.5" : "flex-1 min-w-0 max-w-[280px] gap-4 py-6 px-5"
    }`}
  >
    <div
      className={`relative flex items-center justify-center w-full ${
        compact ? "h-[108px]" : "h-[120px] sm:h-[140px]"
      }`}
    >
      {option.icon ? (
        <img
          src={option.icon}
          alt={option.label}
          loading="eager"
          decoding="sync"
          // @ts-expect-error fetchpriority válido em HTML
          fetchpriority="high"
          className={`object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98] ${
            compact ? "w-[100px] h-[100px]" : "w-[100px] h-[100px] sm:w-[120px] sm:h-[120px]"
          }`}
          draggable={false}
        />
      ) : (
        <option.Fallback
          className={`text-foreground/70 drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)] ${
            compact ? "w-[88px] h-[88px]" : "w-[88px] h-[88px] sm:w-[104px] sm:h-[104px]"
          }`}
          strokeWidth={1.6}
        />
      )}
    </div>
    <div className="text-center w-full px-1">
      <span
        className={`font-bold text-foreground block leading-tight tracking-tight ${
          compact ? "text-sm" : "text-xl sm:text-[22px]"
        }`}
      >
        {option.label}
      </span>
      <span
        className={`text-muted-foreground mt-1 block leading-snug ${
          compact ? "text-[10px] line-clamp-2" : "text-sm"
        }`}
      >
        {option.sub}
      </span>
    </div>
  </button>
);

const OrderTypeScreen = () => {
  const { setScreen, setTableNumber, mesaLocked, mesaManual, tableNumber, clearMesaLock, confirmManualMesa, confirmQrMesa } = useOrder();
  const [mesaDialogOpen, setMesaDialogOpen] = useState(false);
  const { setOrderType } = useCart();
  const { settings, loading: brandingLoading } = useBranding();
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const { storeId } = useResolvedStore();
  const logoGesture = useStaffLogoGesture();
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
    if (type === "here" && !mesaLocked && !mesaManual) {
      setMesaDialogOpen(true);
      return;
    }
    setOrderType(type);
    if (type !== "here") {
      setTableNumber("");
      clearMesaLock();
    }
    setScreen("home");
  };

  const handleManualMesa = (number: string, tableId: string) => {
    confirmManualMesa(number, tableId);
    setMesaDialogOpen(false);
    setScreen("home");
  };

  const handleQrMesa = (number: string, tableId: string, qrToken: string) => {
    confirmQrMesa(number, tableId, qrToken);
    setMesaDialogOpen(false);
    setScreen("home");
  };

  const enabled: OrderOption[] = [];
  if (opts.dine_in) {
    enabled.push({
      key: "here",
      label: t("eatHere"),
      sub: mesaLocked || mesaManual ? t("eatHereSub") : t("mesaScanInstruction"),
      icon: iconDineIn,
      Fallback: UtensilsCrossed,
    });
  }
  if (opts.takeaway) {
    enabled.push({
      key: "takeaway",
      label: t("takeaway"),
      sub: t("takeawaySub"),
      icon: iconTakeaway,
      Fallback: ShoppingBag,
    });
  }
  if (opts.delivery && !mesaLocked && !mesaManual) {
    enabled.push({
      key: "delivery",
      label: t("delivery"),
      sub: t("deliverySub"),
      icon: iconDelivery,
      Fallback: Bike,
    });
  }

  const isCompactGrid = enabled.length >= 3;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: "env(safe-area-inset-top)",
          background: "var(--customer-safe-top-bg, var(--browser-chrome-hex, #3A0205))",
        }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center px-6 pt-[4.25rem] md:pt-[4.75rem] shrink-0">
        {!brandingLoading && logo && (
          <div
            className="w-full max-w-[200px] aspect-square flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)] select-none touch-none cursor-pointer"
            {...logoGesture}
          >
            <img src={logo} alt={brandName} className="w-full h-full object-contain pointer-events-none" draggable={false} />
          </div>
        )}

        <div className="text-center flex flex-col gap-1 w-full mt-1">
          {(mesaLocked || mesaManual) && tableNumber && (
            <div className="mb-3 inline-flex items-center gap-2.5 px-5 py-2 rounded-full mx-auto border border-border/30 bg-background/70 dark:bg-white/8 backdrop-blur-xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.12)] dark:border-white/12 dark:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.35)]">
              <UtensilsCrossed className="w-4 h-4 text-foreground/55" strokeWidth={2} />
              <span className="text-sm font-semibold text-foreground/90 tracking-wide">
                {t("tableLabel")} {tableNumber}
              </span>
            </div>
          )}
          <h1 className="text-[24px] leading-tight font-black text-foreground tracking-tight">{t("howOrder")}</h1>
          <p className="text-[16px] text-muted-foreground">{t("pickOption")}</p>
        </div>
      </div>

      <div
        className={`flex items-center justify-center w-full flex-1 min-h-0 ${
          isCompactGrid ? "px-1.5 pt-2 pb-1" : "px-5 sm:px-8 pt-4 pb-2"
        }`}
      >
        {enabled.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Nenhuma opção de pedido ativa.</p>
        ) : (
          <div
            className={`flex w-full mx-auto items-stretch justify-center ${
              isCompactGrid
                ? "flex-row flex-nowrap gap-1 max-w-full overflow-x-auto no-scrollbar"
                : "flex-row flex-nowrap gap-4 sm:gap-6 max-w-2xl"
            }`}
          >
            {enabled.map((option) => (
              <OrderTypeCard
                key={option.key}
                option={option}
                compact={isCompactGrid}
                onSelect={() => handleSelect(option.key)}
              />
            ))}
          </div>
        )}
      </div>

      <MesaSetupDialog
        open={mesaDialogOpen}
        storeId={storeId ?? ""}
        onClose={() => setMesaDialogOpen(false)}
        onManualConfirm={handleManualMesa}
        onQrConfirm={handleQrMesa}
      />

      <div className={`${STOREFRONT_FOOTER_WRAP_CLASS} pt-4 mt-auto space-y-3`}>
        <InstallAppButton lang={lang} variant="subtle" />
        <p className="text-center text-[9px] uppercase tracking-[0.22em] text-muted-foreground/30 font-medium pb-1">
          {t("poweredBy")}
        </p>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
