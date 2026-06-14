import { useEffect } from "react";

type LockMode = "portrait" | "landscape" | "any";

/**
 * Trava a orientação do ecrã quando possível:
 * - Em PWA standalone / Capacitor: usa screen.orientation.lock (funciona)
 * - Em browser normal: pode falhar silenciosamente (requer fullscreen) — sem efeito visual negativo
 *
 * @param mode "portrait" para totem cliente / entregador, "landscape" para admin / painel restaurante
 */
export function useScreenOrientationLock(mode: LockMode) {
  useEffect(() => {
    if (mode === "any") return;

    const orientation = (typeof window !== "undefined" && window.screen?.orientation) as
      | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
      | undefined;

    if (!orientation || typeof orientation.lock !== "function") return;

    const target =
      mode === "portrait" ? "portrait-primary" : "landscape-primary";

    orientation.lock(target).catch(() => {
      /* fora de fullscreen / não suportado — ignorar */
    });

    return () => {
      try {
        orientation.unlock?.();
      } catch {
        /* ignore */
      }
    };
  }, [mode]);
}

export default useScreenOrientationLock;
