import { useOrder } from "@/contexts/OrderContext";
import { useLanguage, LANG_LABELS } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
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
  const { settings, loading: brandingLoading } = useBranding();
  const { stores, loading: storeLoading } = useResolvedStore();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const logo =
    (isDark && ((settings as any)?.logo_language_dark_url || (settings as any)?.logo_main_dark_url)) ||
    (settings as any)?.logo_language_url ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "EL REY";

  const langs = activeLangs.length > 0 ? activeLangs : [primaryLang];
  // Mostra o título em TODOS os idiomas ativos (deduplicado, mantém ordem)
  const titles = Array.from(new Set(langs.map((l) => TITLE_BY_LANG[l] || TITLE_BY_LANG.es)));

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    // Se o tenant tem 2+ unidades, vai para a tela de escolha de unidade
    setScreen(stores.length >= 2 ? "storeSelect" : "orderType");
  };

  if (brandingLoading || storeLoading) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-background relative"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 bg-gradient-header pointer-events-none z-0"
          style={{ height: "env(safe-area-inset-top)" }}
        />
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" aria-label="A carregar" />
      </div>
    );
  }

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
      {/* Toggle tema — presente desde a primeira tela */}
      <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      {/* Bloco central: logo + títulos */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 pb-8 gap-1">
        {logo && (
          <div className="w-full max-w-[280px] aspect-square flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <img
              src={logo}
              alt={brandName}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

        <div className="text-center flex flex-col gap-1 w-full">
          {titles.map((tt, idx) => (
            <h1
              key={idx}
              className={`leading-tight font-black tracking-tight ${
                idx === 0
                  ? "text-[24px] text-foreground"
                  : "text-[16px] text-muted-foreground"
              }`}
            >
              {tt}
            </h1>
          ))}
        </div>
      </div>

      {/* Idiomas — horizontal, alinhado ao centro */}
      <div className="flex items-center justify-center px-4 pb-2 w-full">

        <div
          className="flex flex-row items-start justify-center w-full max-w-md flex-nowrap"
          style={{ gap: langs.length >= 4 ? "0.5rem" : langs.length === 3 ? "1rem" : "1.5rem" }}
        >
          {langs.map((code) => {
            const icon = langIcons[code] || FALLBACK_FLAG[code];
            const label = LANG_LABELS[code];
            return (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                className="active:scale-95 transition-transform touch-action-manipulation flex-1 min-w-0"
                aria-label={label}
              >
                <div className="w-full aspect-square flex items-center justify-center">
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

      {/* Footer brand — folga clara em relação aos ícones de idioma */}
      <div className="pt-10 pb-6 px-6 space-y-3">
        <InstallAppButton lang={primaryLang} />
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
          Pizza · Kebab · Burger
        </p>
      </div>
    </div>
  );
};

export default LanguageScreen;
