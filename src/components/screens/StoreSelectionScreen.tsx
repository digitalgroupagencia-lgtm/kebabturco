import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import ThemeToggle from "@/components/ThemeToggle";
import { MapPin, ChevronRight, Store as StoreIcon } from "lucide-react";
import logoFallback from "@/assets/elrey-logo.png";

const TITLE: Record<string, string> = {
  pt: "Escolha a unidade",
  en: "Choose a location",
  es: "Elige tu local",
  fr: "Choisissez votre établissement",
};

const SUBTITLE: Record<string, string> = {
  pt: "Onde será seu pedido?",
  en: "Where will your order be?",
  es: "¿Dónde será tu pedido?",
  fr: "Où sera votre commande ?",
};

const StoreSelectionScreen = () => {
  const { setScreen } = useOrder();
  const { stores, setSelectedStoreId } = useResolvedStore();
  const { lang } = useLanguage();
  const { settings } = useBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const logo =
    (isDark && ((settings as any)?.logo_order_type_dark_url || (settings as any)?.logo_main_dark_url)) ||
    (settings as any)?.logo_order_type_url ||
    settings?.logo_main_url ||
    logoFallback;
  const brandName = settings?.company_name || "EL REY";

  const handleSelect = (id: string) => {
    setSelectedStoreId(id);
    setScreen("orderType");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative">
      <div className="absolute top-4 right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        <div className="w-full max-w-[240px] aspect-[4/3] flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <img src={logo} alt={brandName} className="w-full h-full object-contain" />
        </div>
      </div>

      <div className="px-6 text-center">
        <h1 className="text-[24px] leading-tight font-black text-foreground tracking-tight">
          {TITLE[lang] || TITLE.es}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{SUBTITLE[lang] || SUBTITLE.es}</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 py-8 gap-4 max-w-md w-full mx-auto">
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className="group relative overflow-hidden flex items-center gap-4 p-4 bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border border-border/60 active:scale-[0.97] transition-all touch-action-manipulation text-left"
          >
            <div className="w-20 h-20 flex items-center justify-center shrink-0">
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt={s.name}
                  className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <StoreIcon className="w-9 h-9 text-primary" strokeWidth={2.2} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg font-black text-foreground block leading-tight truncate">{s.name}</span>
              {(s.short_description || s.address) && (
                <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{s.short_description || s.address}</span>
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      <div className="text-center pb-6 px-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          {brandName}
        </p>
      </div>
    </div>
  );
};

export default StoreSelectionScreen;