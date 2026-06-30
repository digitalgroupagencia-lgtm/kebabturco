import { useOrder } from "@/contexts/OrderContext";
import { translateForLang, useLanguage } from "@/contexts/LanguageContext";

/** Só em ecrãs iniciais, nunca sobre o cardápio, carrinho ou personalização. */
const FOOTER_SCREENS = new Set(["language", "orderType", "splash", "storeSelect"]);

const AppFooter = () => {
  const { screen } = useOrder();
  const langCtx = useLanguage();

  if (!FOOTER_SCREENS.has(screen)) return null;

  const credit =
    screen === "language"
      ? translateForLang("poweredBy", langCtx.primaryLang)
      : langCtx.t("poweredBy");

  return (
    <footer
      className="shrink-0 flex justify-center px-4 pt-1"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      aria-label="Créditos de desenvolvimento"
    >
      <p className="text-center text-[10px] leading-tight uppercase tracking-[0.2em] text-muted-foreground/50 font-bold">
        {credit}
      </p>
    </footer>
  );
};

export default AppFooter;
