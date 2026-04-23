import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  /** Variante visual: light = fundo translúcido (header colorido); dark = fundo neutro (telas claras) */
  variant?: "onColor" | "onSurface";
  className?: string;
}

/**
 * Botão único para alternar tema (claro/escuro).
 * Presente em todas as telas do totem desde a primeira tela de idioma.
 */
const ThemeToggle = ({ variant = "onSurface", className = "" }: Props) => {
  const { theme, toggle } = useTheme();
  const base =
    variant === "onColor"
      ? "bg-white/15 hover:bg-white/25 text-primary-foreground"
      : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/60";

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm ${base} ${className}`}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" strokeWidth={2.4} /> : <Moon className="w-4 h-4" strokeWidth={2.4} />}
    </button>
  );
};

export default ThemeToggle;
