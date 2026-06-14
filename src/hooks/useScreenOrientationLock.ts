import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import {
  isLandscapeLockedPath,
  isPortraitLockedPath,
  isStaffWideLayoutPath,
  isCoarseTouchDevice,
} from "@/lib/orientationPolicy";

type RotateMode = "none" | "fp" | "fl";

function clearRotateClasses() {
  document.body.classList.remove("fp-rotate", "fl-rotate");
  document.body.style.removeProperty("--fp-w");
  document.body.style.removeProperty("--fp-h");
  document.body.style.removeProperty("--fl-w");
  document.body.style.removeProperty("--fl-h");
}


function resolveRotateMode(
  portraitLock: boolean,
  landscapeLock: boolean,
  touch: boolean,
  w: number,
  h: number,
): RotateMode {
  if (portraitLock && touch && w > h && w >= 600) return "fp";
  if (landscapeLock && touch && h > w && h >= 600) return "fl";
  return "none";
}

function applyRotateMode(mode: RotateMode, w: number, h: number) {
  clearRotateClasses();
  if (mode === "fp") {
    document.body.style.setProperty("--fp-w", `${w}px`);
    document.body.style.setProperty("--fp-h", `${h}px`);
    document.body.classList.add("fp-rotate");
    return;
  }
  if (mode === "fl") {
    document.body.style.setProperty("--fl-w", `${w}px`);
    document.body.style.setProperty("--fl-h", `${h}px`);
    document.body.classList.add("fl-rotate");
  }
}

/**
 * Bloqueio de orientação por rota (PWA standalone / Capacitor).
 * No browser normal o lock da API falha em silêncio; o fallback CSS só corre em touch grosso.
 */
export function useScreenOrientationLock(_mode?: "portrait" | "landscape" | "any") {
  const { pathname } = useLocation();
  const portraitLock = isPortraitLockedPath(pathname);
  const landscapeLock = isLandscapeLockedPath(pathname);
  const activeModeRef = useRef<RotateMode>("none");

  useEffect(() => {
    const html = document.documentElement;
    const inEditor = isLovableEditorPreview();
    const touch = isCoarseTouchDevice();

    if (isStaffWideLayoutPath(pathname)) {
      html.classList.add("staff-landscape-layout");
    } else {
      html.classList.remove("staff-landscape-layout");
    }

    const cleanupRotate = () => {
      activeModeRef.current = "none";
      clearRotateClasses();
    };

    if (!portraitLock && !landscapeLock) {
      try {
        // @ts-expect-error Screen Orientation API
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      cleanupRotate();
      return () => {
        html.classList.remove("staff-landscape-layout");
        cleanupRotate();
      };
    }

    // Preview Lovable: sem rotate CSS (resize ↔ rotate causava piscar infinito).
    if (inEditor) {
      cleanupRotate();
      return () => {
        html.classList.remove("staff-landscape-layout");
        cleanupRotate();
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
      const nextMode = resolveRotateMode(portraitLock, landscapeLock, touch, w, h);

      if (nextMode === activeModeRef.current) return;

      activeModeRef.current = nextMode;
      applyRotateMode(nextMode, w, h);
    };

    apply();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      html.classList.remove("staff-landscape-layout");
      cleanupRotate();
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
