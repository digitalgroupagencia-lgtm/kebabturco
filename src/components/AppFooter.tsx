import { useOrder } from "@/contexts/OrderContext";

const HIDDEN_SCREENS = new Set(["confirmation", "payment"]);

const AppFooter = () => {
  const { screen } = useOrder();

  if (HIDDEN_SCREENS.has(screen)) return null;

  return (
    <footer
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex justify-center"
      style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
      aria-label="Créditos de desenvolvimento"
    >
      <p className="px-4 text-center text-[10px] leading-tight text-white/50">
        Desenvolvido por Euro Business Group
      </p>
    </footer>
  );
};

export default AppFooter;
