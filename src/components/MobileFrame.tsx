import { ReactNode } from "react";

/**
 * Moldura mobile no desktop + ecrã completo no telemóvel real.
 * Uma única árvore React — evita montar a app duas vezes no desktop.
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-background md:bg-neutral-900 md:p-4 sm:md:p-6">
      <div
        className="relative flex h-full w-full min-h-0 flex-col overflow-hidden md:h-[min(880px,calc(100dvh-2rem))] md:w-[min(420px,calc(100vw-2rem))] md:rounded-[3rem] md:bg-black md:p-[14px] md:shadow-2xl"
      >
        <div
          className="pointer-events-none absolute top-3 left-1/2 z-20 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black md:block"
          aria-hidden
        />
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:rounded-[2.3rem] md:bg-background">
          <div
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 right-0 z-[60] md:hidden"
            style={{
              height: "env(safe-area-inset-top)",
              background: "var(--gradient-header)",
            }}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
