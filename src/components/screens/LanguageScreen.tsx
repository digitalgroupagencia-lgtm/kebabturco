import { useOrder } from "@/contexts/OrderContext";
import { useLanguage, LANG_LABELS } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { useCustomerBottomInset } from "@/hooks/useCustomerBottomInset";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";
import flagBr from "@/assets/flag-br.png";
import flagUs from "@/assets/flag-us.png";
import flagEs from "@/assets/flag-es.png";
import flagFr from "@/assets/flag-fr.png";

const FALLBACK_FLAG: Record<string, string> = {
  pt: flagBr,
  en: flagUs,
  es: flagEs,
  fr: flagFr,
};

const TITLE_BY_LANG: Record<string, string> = {
  pt: "Escolha seu idioma",
  en: "Choose your language",
  es: "Elige tu idioma",
  fr: "Choisissez votre langue",
};

const LanguageScreen = () => {
  const { setScreen } = useOrder();
  const { setLang, primaryLang, activeLangs, langIcons } = useLanguage();
  const { settings } = useBranding();
  const { stores, loading: storeLoading } = useResolvedStore();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bottomInset = useCustomerBottomInset();

  const logo =
    (isDark && ((settings as any)?.logo_language_dark_url || (settings as any)?.logo_main_dark_url)) ||
    (settings as any)?.logo_language_url ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "EL REY";

  const langs = activeLangs.length > 0 ? activeLangs : [primaryLang];
  const titles = Array.from(new Set(langs.map((l) => TITLE_BY_LANG[l] || TITLE_BY_LANG.es)));

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    setScreen(stores.length >= 2 ? "storeSelect" : "orderType");
  };

  if (storeLoading) {
    return (
      <div
        className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-[#CC0000] relative"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <p className="text-white font-bold text-lg mb-4">Kebab Turco</p>
        <div
          className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin"
          aria-label="A carregar"
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative overflow-x-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: bottomInset,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-header pointer-events-none z-0"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center px-5 pt-3 pb-2 gap-2 shrink-0">
        {logo && (
          <div className="w-[min(42vw,160px)] h-[min(42vw,160px)] flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <img src={logo} alt={brandName} className="w-full h-full object-contain" draggable={false} />
          </div>
        )}

        <div className="text-center flex flex-col gap-0.5 w-full">
          {titles.map((tt, idx) => (
            <h1
              key={idx}
              className={`leading-tight font-black tracking-tight ${
                idx === 0 ? "text-[22px] text-foreground" : "text-[15px] text-muted-foreground"
              }`}
            >
              {tt}
            </h1>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-[120px]">
        <div
          className="grid w-full max-w-sm gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(langs.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {langs.map((code) => {
            const icon = langIcons[code] || FALLBACK_FLAG[code];
            const label = LANG_LABELS[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className="active:scale-95 transition-transform touch-action-manipulation flex flex-col items-center gap-1"
                aria-label={label}
              >
                <div className="w-full max-w-[88px] mx-auto aspect-square flex items-center justify-center">
                  <img
                    src={icon}
                    alt={label}
                    className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
                    draggable={false}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 pt-2 pb-3 px-6 space-y-2">
        <InstallAppButton lang={primaryLang} />
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          Pizza · Kebab · Burger
        </p>
      </div>
    </div>
  );
};

export default LanguageScreen;
