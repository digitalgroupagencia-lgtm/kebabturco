import { Languages } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage, LANG_LABELS } from "@/contexts/LanguageContext";
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

  const langs = activeLangs.length > 0 ? activeLangs : [primaryLang];
  const title = TITLE_BY_LANG[primaryLang] || TITLE_BY_LANG.es;
  const cols = Math.min(langs.length, 4);

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    setScreen("orderType");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Languages className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-black text-foreground text-center px-2">
        {title}
      </h2>

      <div
        className="mt-8 w-full max-w-sm grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {langs.map((code) => {
          const icon = langIcons[code] || FALLBACK_FLAG[code];
          return (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className="aspect-square bg-card border border-border rounded-2xl shadow-sm active:scale-[0.95] transition-transform touch-action-manipulation flex items-center justify-center overflow-hidden p-2"
              aria-label={LANG_LABELS[code]}
            >
              <img
                src={icon}
                alt={LANG_LABELS[code]}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageScreen;
