import { useEffect, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage, LANG_LABELS } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import { readMenuCache } from "@/lib/menuCache";
import { collectMenuCatalogFields } from "@/lib/menuLocale";
import { useStaffLogoGesture } from "@/hooks/useStaffLogoGesture";
import { dismissBootShell } from "@/lib/bootShell";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";
import flagBr from "@/assets/flag-br.png";
import flagUs from "@/assets/flag-us.png";
import flagEs from "@/assets/flag-es.png";
import flagFr from "@/assets/flag-fr.png";
import CustomerLanguageSkeleton from "@/customer/components/CustomerLanguageSkeleton";
import { STOREFRONT_FOOTER_WRAP_CLASS } from "@/lib/storefrontFooter";

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
  const { setLang, primaryLang, activeLangs, langIcons, langsReady, ensureMenuLocalizedReady } = useLanguage();
  const { settings, loading: brandingLoading } = useBranding();
  const { stores, setSelectedStoreId, storeId, loading: storeLoading } = useResolvedStore();
  const { theme } = useTheme();
  const logoGesture = useStaffLogoGesture();
  const isDark = theme === "dark";
  const [forceVisible, setForceVisible] = useState(false);

  const logo =
    (isDark && ((settings as any)?.logo_language_dark_url || (settings as any)?.logo_main_dark_url)) ||
    (settings as any)?.logo_language_url ||
    settings?.logo_main_url ||
    "/apple-touch-icon.png";
  const brandName = settings?.company_name || "EL REY";

  const langs = langsReady && activeLangs.length > 0 ? activeLangs : ["es", "pt", "en", "fr"] as const;
  const titles = Array.from(new Set(langs.map((l) => TITLE_BY_LANG[l] || TITLE_BY_LANG.es)));

  const screenReady = forceVisible || (!storeLoading && langsReady && !brandingLoading);

  useEffect(() => {
    // O ecrã cliente nunca pode ficar preso atrás do boot branco do iOS.
    const timer = window.setTimeout(() => {
      setForceVisible(true);
      dismissBootShell();
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (screenReady) dismissBootShell();
  }, [screenReady]);

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    if (storeId && code !== primaryLang) {
      const cached = readMenuCache(storeId);
      if (cached) {
        void ensureMenuLocalizedReady(collectMenuCatalogFields(cached.categories, cached.products));
      }
    }
    setScreen(stores.length >= 2 ? "storeSelect" : "orderType");
  };

  if (!screenReady) {
    return <CustomerLanguageSkeleton languageCount={Math.max(langs.length, 2)} />;
  }

  return (
    <div
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: "env(safe-area-inset-top)",
          background: "var(--browser-chrome-hex, #3A0205)",
        }}
      />
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      {/* Logo + títulos, tamanho original, sem flex-1 (evita espaço branco gigante) */}
      <div className="flex flex-col items-center px-6 pt-3 shrink-0">
        <div
          className="w-full max-w-[200px] aspect-square flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)] select-none touch-none cursor-pointer"
          {...logoGesture}
        >
          <img src={logo} alt={brandName} className="w-full h-full object-contain pointer-events-none" draggable={false} />
        </div>

        <div className="text-center flex flex-col gap-1 w-full">
          {titles.map((tt, idx) => (
            <h1
              key={idx}
              className={`leading-tight font-black tracking-tight ${
                idx === 0 ? "text-[24px] text-foreground" : "text-[16px] text-muted-foreground"
              }`}
            >
              {tt}
            </h1>
          ))}
        </div>
      </div>

      {/* Bandeiras, altura limitada para o rodapé (App Store / Play) ficar sempre visível */}
      <div className="flex min-h-0 items-center justify-center overflow-hidden px-4 py-2 w-full">
        <div
          className="flex flex-row items-center justify-center w-full max-w-md flex-nowrap"
          style={{ gap: langs.length >= 4 ? "0.5rem" : langs.length === 3 ? "1rem" : "1.5rem" }}
        >
          {langs.map((code) => {
            const icon = langIcons[code] || FALLBACK_FLAG[code];
            const label = LANG_LABELS[code];
            const flagMax =
              langs.length >= 4 ? "max-w-[88px]" : langs.length === 3 ? "max-w-[110px]" : "max-w-[148px]";
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`active:scale-95 transition-transform touch-action-manipulation flex-1 min-w-0 ${flagMax}`}
                aria-label={label}
              >
                <div className="w-full aspect-square flex items-center justify-center">
                  <img
                    src={icon}
                    alt={label}
                    loading="eager"
                    decoding="sync"
                    className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
                    draggable={false}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${STOREFRONT_FOOTER_WRAP_CLASS} space-y-2`}>
        <InstallAppButton lang={primaryLang} />
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold pb-1">
          Desenvolvido por Euro Business Group
        </p>
      </div>
    </div>
  );
};

export default LanguageScreen;
