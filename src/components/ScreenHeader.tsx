import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { shouldHideHeader } from "@/lib/embed-mode";

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  sticky?: boolean;
}

/**
 * Header padrão usado em todas as telas internas.
 * Mantém o mesmo visual da Home: gradiente, glows decorativos
 * e cantos inferiores arredondados.
 */
const ScreenHeader = ({ eyebrow, title, onBack, right, sticky = false }: ScreenHeaderProps) => {
  if (shouldHideHeader()) {
    if (!onBack) return null;
    return (
      <div className="absolute top-3 left-3 z-40">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/15 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <header
      className={`relative bg-gradient-header text-primary-foreground px-5 pb-5 shrink-0 shadow-header overflow-hidden rounded-b-[18px] ${
        sticky ? "sticky top-0 z-40" : ""
      }`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        marginTop: sticky ? "calc(-1 * env(safe-area-inset-top))" : undefined,
      }}
    >
      {/* Glows decorativos sutis (mesmo padrão da Home) */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-black/15 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col min-w-0">
            {eyebrow && (
              <span className="text-[10px] uppercase tracking-[0.28em] opacity-80 font-bold truncate">
                {eyebrow}
              </span>
            )}
            <h1 className="text-[22px] font-black tracking-tight leading-none mt-1 truncate">
              {title}
            </h1>
          </div>
        </div>

        <div className="relative shrink-0 flex items-center gap-2">
          {right}
          <ThemeToggle variant="onColor" className="w-9 h-9 shadow-none" />
        </div>
      </div>
    </header>
  );
};

export default ScreenHeader;