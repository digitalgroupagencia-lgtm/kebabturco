import { Capacitor } from "@capacitor/core";

type Orientation = "portrait" | "landscape" | "unspecified";

/**
 * Lock orientation using @capacitor/screen-orientation when available.
 * Falls back gracefully on the web (no-op).
 *
 * - `portrait`  → portrait-primary (telas do cliente / entregador no celular)
 * - `landscape` → landscape (tablets do staff / painel)
 * - `unspecified` → libera (o OS decide)
 */
export async function setAndroidOrientation(orientation: Orientation) {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;

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
    console.warn("[AndroidOrientation] falha ao ajustar orientação", error);
  }
}
