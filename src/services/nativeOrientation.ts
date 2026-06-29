import { Capacitor } from "@capacitor/core";
import { isCapacitorNativeSync } from "@/lib/capacitorRuntime";

type Orientation = "portrait" | "landscape" | "unspecified";

/**
 * Bloqueia orientação no iPhone/Android via @capacitor/screen-orientation.
 * No browser usa só CSS (fp-rotate) — sem efeito aqui.
 */
export async function setNativeOrientation(orientation: Orientation) {
  if (typeof window === "undefined") return;
  if (!isCapacitorNativeSync() && !Capacitor.isNativePlatform()) return;

  try {
    const mod = await import("@capacitor/screen-orientation");
    const plugin = mod.ScreenOrientation;
    if (!plugin) return;

    if (orientation === "unspecified") {
      await plugin.unlock();
      return;
    }

    const target = orientation === "landscape" ? "landscape-primary" : "portrait-primary";
    await plugin.lock({ orientation: target as never });
  } catch (error) {
    console.warn("[NativeOrientation] falha ao ajustar orientação", error);
  }
}

/** @deprecated use setNativeOrientation */
export const setAndroidOrientation = setNativeOrientation;
