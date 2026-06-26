import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isLovableEditorPreview } from "@/lib/lovablePreview";
import {
  isLandscapeLockedPath,
  isPortraitLockedPath,
  isStaffWideLayoutPath,
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

/** Totem em landscape físico → CSS vertical; painel admin em portrait → CSS horizontal. */
function resolveRotateMode(
  portraitLock: boolean,
  landscapeLock: boolean,
  touch: boolean,
  w: number,
  h: number,
): RotateMode {
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

/**
 * Bloqueio de orientação por rota (PWA standalone / Capacitor).
 * Admin/painel: lock landscape nativo quando possível; em telemóvel vertical usa rotate CSS.
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

    if (inEditor) {
      cleanupRotate();
      return () => {
        html.classList.remove("staff-landscape-layout");
        cleanupRotate();
      };
    }

    const lockMode = landscapeLock ? "landscape" : "portrait";
    try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    const lock = orientation.lock;
      if (typeof lock === "function") {
        lock.call(orientation, lockMode).catch(() => {
          /* utilizador deve rodar o aparelho */
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
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
    };
  }, [pathname, portraitLock, landscapeLock]);
}

export default useScreenOrientationLock;
