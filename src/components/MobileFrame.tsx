import { ReactNode } from "react";
import AdminMasterStorefrontBack from "@/components/customer/AdminMasterStorefrontBack";

const DESKTOP_FRAME =
  "[@media(hover:hover)_and_(pointer:fine)]:bg-neutral-900 [@media(hover:hover)_and_(pointer:fine)]:p-4 [@media(hover:hover)_and_(pointer:fine)]:sm:p-6";

const PHONE_BEZEL =
  "[@media(hover:hover)_and_(pointer:fine)]:h-[min(880px,calc(100dvh-2rem))] [@media(hover:hover)_and_(pointer:fine)]:w-[min(420px,calc(100vw-2rem))] [@media(hover:hover)_and_(pointer:fine)]:rounded-[3rem] [@media(hover:hover)_and_(pointer:fine)]:bg-black [@media(hover:hover)_and_(pointer:fine)]:p-[14px] [@media(hover:hover)_and_(pointer:fine)]:shadow-2xl";

/**
 * Moldura mobile só no desktop com rato — telemóvel real usa ecrã completo
 * (incluindo landscape, onde md: disparava a moldura de 420px por engano).
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={`flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--browser-chrome-hex,#5C1419)] ${DESKTOP_FRAME}`}
    >
      <div className={`relative flex h-full w-full min-h-0 flex-col overflow-hidden ${PHONE_BEZEL}`}>
        <div
          className="pointer-events-none absolute top-3 left-1/2 z-20 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black [@media(hover:hover)_and_(pointer:fine)]:block"
          aria-hidden
        />
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto [@media(hover:hover)_and_(pointer:fine)]:overflow-hidden [@media(hover:hover)_and_(pointer:fine)]:rounded-[2.3rem] [@media(hover:hover)_and_(pointer:fine)]:bg-background">
          <AdminMasterStorefrontBack />
          <div
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 right-0 z-[60] [@media(hover:hover)_and_(pointer:fine)]:hidden"
            style={{
              height: "max(env(safe-area-inset-top), 0px)",
              background: "var(--browser-chrome-hex, #5C1419)",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
            }}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
