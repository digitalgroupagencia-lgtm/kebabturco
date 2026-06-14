import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { isCoarseTouchDevice, isLandscapeLockedPath } from "@/lib/orientationPolicy";

/**
 * Em telemóvel/tablet em vertical no painel admin — pede para rodar.
 * Sem rotate CSS: o layout largo só funciona com o aparelho deitado de verdade.
 */
export default function StaffLandscapePrompt() {
  const { pathname } = useLocation();
  const [needsRotate, setNeedsRotate] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!isLandscapeLockedPath(pathname) || !isCoarseTouchDevice()) {
        setNeedsRotate(false);
        return;
      }
      setNeedsRotate(window.innerHeight > window.innerWidth);
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [pathname]);

  if (!needsRotate) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background px-8 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-rotate-title"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Smartphone className="h-10 w-10 rotate-90 text-primary" aria-hidden />
      </div>
      <h2 id="staff-rotate-title" className="mt-6 text-xl font-bold text-foreground">
        Rode o dispositivo para horizontal
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        O painel de administração abre como no computador — com o telemóvel ou tablet deitado (modo
        horizontal).
      </p>
    </div>
  );
}
