import { ReactNode } from "react";

/**
 * MobileFrame
 * Envolve o conteúdo do TOTEM (cliente final) e força aparência mobile no desktop.
 * - No mobile real (< 768px): renderiza fullscreen normal.
 * - No desktop (>= 768px): mostra moldura de celular centralizada com fundo escuro nas laterais.
 * Não afeta /admin nem /panel.
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Mobile real: passa direto */}
      <div className="md:hidden min-h-screen w-full">{children}</div>

      {/* Desktop: moldura de celular */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center bg-neutral-900 p-6">
        <div
          className="relative bg-black rounded-[3rem] shadow-2xl"
          style={{
            width: "420px",
            height: "880px",
            padding: "14px",
          }}
        >
          {/* Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />
          {/* Tela */}
          <div className="relative w-full h-full overflow-hidden rounded-[2.3rem] bg-background">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
