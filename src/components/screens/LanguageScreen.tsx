import { useOrder } from "@/contexts/OrderContext";
import { useLanguage, LANG_LABELS } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import ThemeToggle from "@/components/ThemeToggle";
import flagBr from "@/assets/flag-br.png";
import flagUs from "@/assets/flag-us.png";
import flagEs from "@/assets/flag-es.png";
import flagFr from "@/assets/flag-fr.png";
import logoFallback from "@/assets/elrey-logo.png";

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
  const logo = (settings as any)?.logo_language_url || settings?.logo_main_url || logoFallback;
  const brandName = settings?.company_name || "EL REY";

  const langs = activeLangs.length > 0 ? activeLangs : [primaryLang];
  // Mostra o título em TODOS os idiomas ativos (deduplicado, mantém ordem)
  const titles = Array.from(new Set(langs.map((l) => TITLE_BY_LANG[l] || TITLE_BY_LANG.es)));
  // Mostra em coluna única (igual OrderType) quando 1-2 idiomas; em 2 colunas para 3-4
  const cols = langs.length >= 3 ? 2 : 1;

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    setScreen("orderType");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background animate-fade-in relative">
      {/* Toggle tema — presente desde a primeira tela */}
      <div className="absolute top-4 right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <ThemeToggle />
      </div>

      {/* Logo header — mesmo padrão da OrderTypeScreen */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        <div className="w-full max-w-[280px] aspect-[4/3] flex items-center justify-center drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <img src={logo} alt={brandName} className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Título */}
      <div className="px-6 text-center flex flex-col gap-1.5">
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

      {/* Cards de idioma — mesmo visual dos cards de "comer aqui/levar" */}
      <div className="flex-1 flex flex-col justify-center px-5 py-6 gap-3 max-w-md w-full mx-auto">
        <div
          className={`grid gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {langs.map((code) => {
            const icon = langIcons[code] || FALLBACK_FLAG[code];
            const label = LANG_LABELS[code];
            return (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                className={`group relative overflow-hidden flex ${cols === 1 ? "flex-row items-center gap-4 p-5" : "flex-col items-center gap-3 p-4"} bg-card rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] border border-border/60 active:scale-[0.97] transition-all touch-action-manipulation`}
                aria-label={label}
              >
                <div className={`${cols === 1 ? "w-20 h-20" : "w-24 h-24"} rounded-3xl bg-secondary/40 flex items-center justify-center shrink-0 overflow-hidden p-2`}>
                  <img
                    src={icon}
                    alt={label}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
                <span className={`${cols === 1 ? "text-left flex-1 text-lg" : "text-center text-base"} font-black text-foreground leading-tight`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
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

export default LanguageScreen;
