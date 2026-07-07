import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isCapacitorNativeSync } from "@/lib/capacitorRuntime";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import {
  isLandscapeLockedPath,
  isPortraitLockedPath,
  isStaffWideLayoutPath,
  isStaffWideScreen,
  isCoarseTouchDevice,
} from "@/lib/orientationPolicy";

type RotateMode = "none" | "fp";

function clearRotateClasses() {
  document.body.classList.remove("fp-rotate", "fl-rotate");
  document.body.style.removeProperty("--fp-w");
  document.body.style.removeProperty("--fp-h");
  document.body.style.removeProperty("--fl-w");
  document.body.style.removeProperty("--fl-h");
}

/** Totem em landscape físico → CSS vertical; KDS em portrait → CSS horizontal (só app nativa). */
function resolveRotateMode(
  portraitLock: boolean,
  landscapeLock: boolean,
  touch: boolean,
  w: number,
  h: number,
): RotateMode {
  if (!isCapacitorNativeSync()) return "none";
  if (landscapeLock && touch && h > w) return "fp";
  if (portraitLock && touch && w > h && w >= 600) return "fp";
  return "none";
}

function applyRotateMode(mode: RotateMode, w: number, h: number) {
  clearRotateClasses();
  if (mode !== "fp") return;
  document.body.style.setProperty("--fp-w", `${w}px`);
  document.body.style.setProperty("--fp-h", `${h}px`);
  document.body.classList.add("fp-rotate");
}

function applyStaffWideLayoutClass(pathname: string, w: number, h: number) {
  const html = document.documentElement;
  if (isStaffWideLayoutPath(pathname) && isStaffWideScreen(w, h)) {
    html.classList.add("staff-landscape-layout");
  } else {
    html.classList.remove("staff-landscape-layout");
  }
}

/**
 * Orientação por rota. Browser: sempre vertical legível nos painéis.
 * App nativa: só KDS pode forçar horizontal com rotação CSS.
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

    const cleanupRotate = () => {
      activeModeRef.current = "none";
      clearRotateClasses();
    };

    const apply = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      applyStaffWideLayoutClass(pathname, w, h);

      if (!portraitLock && !landscapeLock) {
        cleanupRotate();
        return;
      }

      if (inEditor) {
        cleanupRotate();
        return;
      }

      const nextMode = resolveRotateMode(portraitLock, landscapeLock, touch, w, h);

      if (nextMode === activeModeRef.current) {
        if (nextMode !== "none") applyRotateMode(nextMode, w, h);
        return;
      }

      activeModeRef.current = nextMode;
      applyRotateMode(nextMode, w, h);
    };

    if (!portraitLock && !landscapeLock) {
      try {
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
    } else if (!inEditor) {
      const lockMode = landscapeLock ? "landscape" : "portrait";
      try {
        const lock = screen.orientation?.lock;
        if (typeof lock === "function") {
          lock.call(screen.orientation, lockMode).catch(() => {
            /* utilizador deve rodar o aparelho */
          });
        }
      } catch {
        /* noop */
      }
    }

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
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
    };
  }, [pathname, portraitLock, landscapeLock]);
}

export default useScreenOrientationLock;
