import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "pt" as const, flag: "🇧🇷", label: "Português" },
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "es" as const, flag: "🇪🇸", label: "Español" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
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
      <div className="text-5xl mb-4">🌍</div>
      <h2 className="text-2xl font-bold text-foreground mb-8">Choose your language</h2>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => handleSelect(l.code)}
            className="flex flex-col items-center gap-2 p-6 bg-card rounded-2xl shadow-card border border-border active:scale-95 transition-transform touch-action-manipulation"
          >
            <span className="text-5xl">{l.flag}</span>
            <span className="text-lg font-bold text-foreground">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageScreen;
