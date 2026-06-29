import { Capacitor } from "@capacitor/core";
import { isCapacitorNativeSync, markCapacitorNativeRuntime } from "@/lib/capacitorRuntime";

markCapacitorNativeRuntime();

/** App instalada da loja (iPhone/Android), não mostrar botões de download. */
export function isNativeApp(): boolean {
  return isCapacitorNativeSync() || Capacitor.isNativePlatform();
}

/** PWA adicionada ao ecrã inicial (Safari/Chrome). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
