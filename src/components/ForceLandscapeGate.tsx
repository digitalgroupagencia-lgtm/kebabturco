import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Painéis operacionais (admin / restaurante / cozinha / live) DEVEM abrir
 * sempre em modo landscape, mesmo em tablets.
 *
 * - Tenta `screen.orientation.lock('landscape')` (PWA/Android WebView).
 * - Se o aparelho estiver em portrait e for touch (tablet) e a rota for
 *   panel/admin, aplica rotate(90deg) no <body> trocando width/height —
 *   o painel sempre aparece horizontal sem pedir ao utilizador para virar.
 * - Exceções (continuam responsivos): /delivery, /seller, /staff (login),
 *   /auth, e qualquer rota de cliente.
 */
function isLandscapeLockedPath(p: string): boolean {
  if (p.startsWith("/admin")) return true;
  if (p.startsWith("/panel")) return true;
  if (p.startsWith("/kds")) return true;
  return false;
}

export default function ForceLandscapeGate() {
  const { pathname } = useLocation();
  const shouldLock = isLandscapeLockedPath(pathname);

  useEffect(() => {
    if (!shouldLock) {
      try {
        // @ts-ignore
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      document.body.classList.remove("fl-rotate");
      document.body.style.removeProperty("--fl-w");
      document.body.style.removeProperty("--fl-h");
      return;
    }

    try {
      // @ts-ignore
      const lock = screen.orientation?.lock;
      if (typeof lock === "function") {
        // @ts-ignore
        lock.call(screen.orientation, "landscape").catch(() => {
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
      const isPortrait = h > w;
      const meaningful = h >= 600;
      const shouldRotate = isTouch && isPortrait && meaningful;

      if (shouldRotate) {
        document.body.style.setProperty("--fl-w", `${w}px`);
        document.body.style.setProperty("--fl-h", `${h}px`);
        document.body.classList.add("fl-rotate");
      } else {
        document.body.classList.remove("fl-rotate");
        document.body.style.removeProperty("--fl-w");
        document.body.style.removeProperty("--fl-h");
      }
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.body.classList.remove("fl-rotate");
      document.body.style.removeProperty("--fl-w");
      document.body.style.removeProperty("--fl-h");
    };
  }, [shouldLock]);

  return (
    <style>{`
      body.fl-rotate {
        overflow: hidden !important;
        position: fixed !important;
        inset: 0 !important;
        margin: 0 !important;
      }
      body.fl-rotate > #root {
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--fl-h);
        height: var(--fl-w);
        transform: translate(-50%, -50%) rotate(90deg);
        transform-origin: center center;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
    `}</style>
  );
}
