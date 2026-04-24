import { ReactNode } from "react";

/**
 * MobileFrame
 * Envolve o conteúdo do TOTEM (cliente final) e força aparência mobile no desktop.
 * - No mobile real (< 768px): renderiza fullscreen normal, com proteção contra a barra
 *   de endereço do navegador (cobre o topo com cor primária para o header não ficar
 *   cortado quando a barra retrai).
 * - No desktop (>= 768px): mostra moldura de celular centralizada.
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Mobile real */}
      <div className="md:hidden min-h-[100dvh] w-full bg-background relative">
        {/* Camada que pinta a área da safe-area-top (atrás da barra do navegador / notch)
            com a cor do header, evitando "corte" visual quando a URL bar aparece. */}
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
          style={{
            height: "env(safe-area-inset-top)",
            background: "var(--gradient-header)",
          }}
        />
        {children}
      </div>

      {/* Desktop: moldura de celular */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center bg-neutral-900 p-6">
        <div
          className="relative bg-black rounded-[3rem] shadow-2xl"
          style={{ width: "420px", height: "880px", padding: "14px" }}
        >
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />
          <div className="relative w-full h-full overflow-hidden rounded-[2.3rem] bg-background">
            {/* Sem scroll externo: cada tela do totem gerencia o próprio scroll
                interno, garantindo que headers sticky permaneçam fixos. */}
            <div className="w-full h-full overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
