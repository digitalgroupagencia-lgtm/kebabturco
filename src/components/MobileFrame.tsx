import { ReactNode } from "react";

/**
 * Moldura mobile no desktop + ecrã completo no telemóvel real.
 * Todo o conteúdo (incluindo barras inferiores) fica dentro desta área.
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Telemóvel real */}
      <div className="md:hidden flex h-[100dvh] w-full flex-col overflow-hidden bg-background relative">
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 z-[60] pointer-events-none md:hidden"
          style={{
            height: "env(safe-area-inset-top)",
            background: "var(--gradient-header)",
          }}
        />
        {children}
      </div>

      {/* Desktop: moldura de telemóvel */}
      <div className="hidden md:flex h-[100dvh] w-full items-center justify-center bg-neutral-900 p-4 sm:p-6 overflow-hidden">
        <div
          className="relative flex flex-col bg-black rounded-[3rem] shadow-2xl shrink-0"
          style={{
            width: "min(420px, calc(100vw - 2rem))",
            height: "min(880px, calc(100dvh - 2rem))",
            padding: "14px",
          }}
        >
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20 pointer-events-none" />
          <div className="relative flex flex-1 min-h-0 w-full overflow-hidden rounded-[2.3rem] bg-background">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
