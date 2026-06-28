import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation, type OrientationLockType } from "@capacitor/screen-orientation";
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
  _portraitLock: boolean,
  landscapeLock: boolean,
  touch: boolean,
  w: number,
  h: number,
): RotateMode {
  // Apenas o painel/admin (landscape-lock) usa rotate CSS como fallback
  // quando o telemóvel está em vertical. O /staff e /auth ficam verticais
  // sem rotação forçada — mesmo que o aparelho esteja em landscape.
  if (landscapeLock && touch && h > w) return "fp";
  return "none";
}

function applyRotateMode(mode: RotateMode, w: number, h: number) {
  clearRotateClasses();
  if (mode !== "fp") return;
  document.body.style.setProperty("--fp-w", `${w}px`);
  document.body.style.setProperty("--fp-h", `${h}px`);
  document.body.classList.add("fp-rotate");
}

async function lockNativeOrientation(mode: "portrait" | "landscape" | "any") {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("ScreenOrientation")) return;
  try {
    if (mode === "any") {
      await ScreenOrientation.unlock();
      return;
    }
    const orientation: OrientationLockType = mode === "landscape" ? "landscape-primary" : "portrait-primary";
    await ScreenOrientation.lock({ orientation });
  } catch {
    /* WebView/iPadOS podem recusar o lock; o fallback CSS mantém o layout correcto. */
  }
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

  useLayoutEffect(() => {
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
      void lockNativeOrientation("any");
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
    const requestNativeLock = () => void lockNativeOrientation(lockMode);
    requestNativeLock();
    const relockTimers = [120, 450, 1000].map((ms) => window.setTimeout(requestNativeLock, ms));
    try {
      const orientation = screen.orientation as globalThis.ScreenOrientation & {
        lock?: (orientation: OrientationLockType) => Promise<void>;
      };
      const lock = orientation.lock;
      if (typeof lock === "function") {
        const browserMode: OrientationLockType = landscapeLock ? "landscape-primary" : "portrait-primary";
        lock.call(orientation, browserMode).catch(() => {
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

      if (nextMode === activeModeRef.current) {
        if (nextMode !== "none") applyRotateMode(nextMode, w, h);
        return;
      }

      activeModeRef.current = nextMode;
      applyRotateMode(nextMode, w, h);
    };

    apply();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        requestNativeLock();
        onResize();
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      relockTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      html.classList.remove("staff-landscape-layout");
      cleanupRotate();
      try {
        screen.orientation?.unlock?.();
      } catch {
        /* noop */
      }
      void lockNativeOrientation("any");
    };
  }, [pathname, portraitLock, landscapeLock]);
}

export default useScreenOrientationLock;
