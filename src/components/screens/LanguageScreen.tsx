import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "pt" as const, flag: "https://flagcdn.com/w80/br.png", label: "Português" },
  { code: "en" as const, flag: "https://flagcdn.com/w80/gb.png", label: "English" },
  { code: "es" as const, flag: "https://flagcdn.com/w80/es.png", label: "Español" },
  { code: "fr" as const, flag: "https://flagcdn.com/w80/fr.png", label: "Français" },
];

const LanguageScreen = () => {
  const { setScreen } = useOrder();
  const { setLang } = useLanguage();

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    setScreen("orderType");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground mb-10">Choose your language</h2>
      <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => handleSelect(l.code)}
            className="flex flex-col items-center gap-3 p-5 bg-card rounded-2xl shadow-card border border-border active:scale-95 transition-transform touch-action-manipulation"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border shadow-card flex items-center justify-center bg-secondary">
              <img
                src={l.flag}
                alt={l.label}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-base font-bold text-foreground">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageScreen;
