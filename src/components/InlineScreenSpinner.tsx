import { Loader2 } from "lucide-react";

/** Carregamento dentro de um ecrã já aberto, sem fundo vinho a ecrã inteiro. */
const InlineScreenSpinner = () => (
  <div
    className="flex h-full min-h-[40dvh] flex-col items-center justify-center bg-background"
    aria-busy="true"
    aria-label="A carregar"
  >
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);

export default InlineScreenSpinner;
