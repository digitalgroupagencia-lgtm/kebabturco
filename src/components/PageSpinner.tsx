import { Loader2 } from "lucide-react";

/** Fallback de Suspense, sem hooks de contexto (renderiza antes de LanguageProvider). */
const PageSpinner = () => (
  <div
    className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#3A0205] text-primary-foreground"
    style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <Loader2 className="h-8 w-8 animate-spin text-white/90" aria-label="A carregar" />
  </div>
);

export default PageSpinner;
