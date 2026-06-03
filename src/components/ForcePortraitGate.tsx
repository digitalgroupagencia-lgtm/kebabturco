import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isStaffAppPath } from "@/lib/appRouteKind";

/**
 * Rotas do CLIENTE em tablet: força layout em retrato.
 * - Tenta `screen.orientation.lock('portrait')` (PWA / Android).
 * - Se o aparelho estiver em landscape e for touch (tablet), aplica um
 *   rotate(-90deg) no <body> trocando largura/altura — o cardápio sempre
 *   aparece vertical, sem mensagem pedindo para girar.
 * - Em desktop sem touch o MobileFrame já cuida da moldura.
 * - Não interfere em rotas de admin/KDS/painel.
 */
export default function ForcePortraitGate() {
  const { pathname } = useLocation();
  const isCustomer = !isStaffAppPath(pathname);

  useEffect(() => {
    if (!isCustomer) {
      try {
        // @ts-ignore
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      document.body.classList.remove("fp-rotate");
      document.body.style.removeProperty("--fp-w");
      document.body.style.removeProperty("--fp-h");
      return;
    }

    try {
      // @ts-ignore
      const lock = screen.orientation?.lock;
      if (typeof lock === "function") {
        // @ts-ignore
        lock.call(screen.orientation, "portrait").catch(() => {
          /* fallback CSS abaixo */
        });
      }
    } catch {
      /* noop */
    }

    const isTouch =
      typeof window !== "undefined" &&
      (("ontouchstart" in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

    const apply = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      const meaningful = w >= 600;
      const shouldRotate = isTouch && isLandscape && meaningful;

      if (shouldRotate) {
        document.body.style.setProperty("--fp-w", `${w}px`);
        document.body.style.setProperty("--fp-h", `${h}px`);
        document.body.classList.add("fp-rotate");
      } else {
        document.body.classList.remove("fp-rotate");
        document.body.style.removeProperty("--fp-w");
        document.body.style.removeProperty("--fp-h");
      }
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.body.classList.remove("fp-rotate");
      document.body.style.removeProperty("--fp-w");
      document.body.style.removeProperty("--fp-h");
    };
  }, [isCustomer]);

  // CSS injetado uma vez.
  return (
    <style>{`
      body.fp-rotate {
        overflow: hidden !important;
        position: fixed !important;
        inset: 0 !important;
        margin: 0 !important;
      }
      body.fp-rotate > #root {
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--fp-h);
        height: var(--fp-w);
        transform: translate(-50%, -50%) rotate(-90deg);
        transform-origin: center center;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
    `}</style>
  );
}
