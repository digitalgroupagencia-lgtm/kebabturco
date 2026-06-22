import { Loader2 } from "lucide-react";

/** Fallback de Suspense — sem hooks de contexto (renderiza antes de LanguageProvider). */
const PageSpinner = () => (
  <div
    className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#3A0205] text-primary-foreground"
    style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <Loader2 className="h-8 w-8 animate-spin text-white/90" aria-label="A carregar" />
    <p className="text-sm font-semibold text-white/80">A carregar…</p>
  </div>
);

export default PageSpinner;
