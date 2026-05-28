import { Loader2 } from "lucide-react";

/** Fallback de Suspense — sem hooks de contexto (renderiza antes de LanguageProvider). */
const PageSpinner = () => (
  <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="A carregar" />
    <p className="text-sm font-semibold">A carregar…</p>
  </div>
);

export default PageSpinner;
