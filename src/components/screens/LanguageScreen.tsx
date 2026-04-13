import { Languages } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "pt" as const, label: "Português", short: "PT" },
  { code: "en" as const, label: "English", short: "EN" },
  { code: "es" as const, label: "Español", short: "ES" },
  { code: "fr" as const, label: "Français", short: "FR" },
];

const LanguageScreen = () => {
  const { setScreen } = useOrder();
  const { setLang, t } = useLanguage();

  const handleSelect = (code: "pt" | "en" | "es" | "fr") => {
    setLang(code);
    setScreen("orderType");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Languages className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-3xl font-black text-foreground text-center">{t("chooseLanguage")}</h2>
      <p className="text-muted-foreground text-center mt-2 mb-8">Selecione o idioma para continuar</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleSelect(language.code)}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm active:scale-[0.97] transition-transform touch-action-manipulation text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-sm font-black text-primary mb-4">
              {language.short}
            </div>
            <span className="block text-base font-bold text-foreground">{language.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageScreen;
