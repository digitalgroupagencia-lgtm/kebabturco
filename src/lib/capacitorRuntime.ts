import { Capacitor } from "@capacitor/core";

const NATIVE_FLAG_KEY = "__KEBABTURCO_CAPACITOR_NATIVE__";

/** Marca o runtime como app nativa (chamado no boot quando Capacitor está activo). */
export function markCapacitorNativeRuntime(): void {
  if (typeof window === "undefined") return;
  if (Capacitor.isNativePlatform()) {
    (window as unknown as Record<string, boolean>)[NATIVE_FLAG_KEY] = true;
  }
}

/** Detecção síncrona fiável — TestFlight, tablet Capacitor, etc. */
export function isCapacitorNativeSync(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    [NATIVE_FLAG_KEY]?: boolean;
  };
  if (w[NATIVE_FLAG_KEY] === true) return true;
  if (w.Capacitor?.isNativePlatform?.()) return true;
  const platform = w.Capacitor?.getPlatform?.();
  return platform === "ios" || platform === "android";
}

export function getCapacitorPlatformSync(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const w = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  const p = w.Capacitor?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  return "web";
}
