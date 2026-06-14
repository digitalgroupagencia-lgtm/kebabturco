import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isLandscapeLockedPath,
  isPortraitLockedPath,
  isStaffWideLayoutPath,
  isTouchDevice,
} from "@/lib/orientationPolicy";

function clearRotateClasses() {
  document.body.classList.remove("fp-rotate", "fl-rotate");
  document.body.style.removeProperty("--fp-w");
  document.body.style.removeProperty("--fp-h");
  document.body.style.removeProperty("--fl-w");
  document.body.style.removeProperty("--fl-h");
}

/**
 * Bloqueio de orientação por rota (PWA standalone / Capacitor).
 * No browser normal o lock da API falha em silêncio; o fallback CSS roda só em touch.
 *
 * Chamadas com modo explícito (legado Lovable) são ignoradas — a política vem do pathname
 * via ScreenOrientationEffect na raiz da app.
 */
export function useScreenOrientationLock(_mode?: "portrait" | "landscape" | "any") {
  const { pathname } = useLocation();
  const portraitLock = isPortraitLockedPath(pathname);
  const landscapeLock = isLandscapeLockedPath(pathname);

  useEffect(() => {
    const touch = isTouchDevice();
    const html = document.documentElement;

    if (isStaffWideLayoutPath(pathname) && touch) {
      html.classList.add("staff-landscape-layout");
    } else {
      html.classList.remove("staff-landscape-layout");
    }

    if (!portraitLock && !landscapeLock) {
      try {
        // @ts-expect-error Screen Orientation API
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      clearRotateClasses();
      return () => {
        html.classList.remove("staff-landscape-layout");
        clearRotateClasses();
      };
    }

    const lockMode = landscapeLock ? "landscape" : "portrait";
    try {
      // @ts-expect-error Screen Orientation API
      const lock = screen.orientation?.lock;
      if (typeof lock === "function") {
        // @ts-expect-error Screen Orientation API
        lock.call(screen.orientation, lockMode).catch(() => {
          /* fallback CSS */
        });
      }
    } catch {
      /* noop */
    }

    const apply = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      clearRotateClasses();

      if (portraitLock && touch) {
        const isLandscape = w > h;
        const meaningful = w >= 600;
        if (isLandscape && meaningful) {
          document.body.style.setProperty("--fp-w", `${w}px`);
          document.body.style.setProperty("--fp-h", `${h}px`);
          document.body.classList.add("fp-rotate");
        }
        return;
      }

      if (landscapeLock && touch) {
        const isPortrait = h > w;
        const meaningful = h >= 600;
        if (isPortrait && meaningful) {
          document.body.style.setProperty("--fl-w", `${w}px`);
          document.body.style.setProperty("--fl-h", `${h}px`);
          document.body.classList.add("fl-rotate");
        }
      }
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      html.classList.remove("staff-landscape-layout");
      clearRotateClasses();
      try {
        // @ts-expect-error Screen Orientation API
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
    };
  }, [pathname, portraitLock, landscapeLock]);
}

export default useScreenOrientationLock;
