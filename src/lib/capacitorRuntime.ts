import { Capacitor } from "@capacitor/core";

const NATIVE_FLAG_KEY = "__KEBABTURCO_CAPACITOR_NATIVE__";
export const NATIVE_RUNTIME_EVENT = "kebabturco-native-runtime";
const NATIVE_UA_TOKEN = "KebabTurcoCapacitor";

let bootstrapStarted = false;

/** Marca o runtime como app nativa (chamado no boot quando Capacitor está activo). */
export function markCapacitorNativeRuntime(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[NATIVE_FLAG_KEY] = true;
  if (Capacitor.isNativePlatform()) {
    (window as unknown as Record<string, boolean>)[NATIVE_FLAG_KEY] = true;
  }
}

function readNativeFlag(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as Record<string, boolean | undefined>)[NATIVE_FLAG_KEY] === true;
}

function hasInjectedApnsToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = (window as unknown as Record<string, string | undefined>).__kebabturcoNativeApnsToken;
  return typeof token === "string" && token.length > 0;
}

function hasCapacitorUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return new RegExp(NATIVE_UA_TOKEN, "i").test(navigator.userAgent) || /Capacitor/i.test(navigator.userAgent);
}

function hasCapacitorWebkitBridge(): boolean {
  if (typeof window === "undefined") return false;
  const handlers = (window as unknown as { webkit?: { messageHandlers?: Record<string, unknown> } }).webkit
    ?.messageHandlers;
  if (!handlers) return false;
  return Object.keys(handlers).some((key) => /capacitor|bridge|ionic/i.test(key));
}

function readCapacitorPlatform(): string | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  return platform ?? null;
}

function readCapacitorIsNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Detecção síncrona fiável — TestFlight, tablet Capacitor, site remoto kebabturco.net. */
export function isCapacitorNativeSync(): boolean {
  if (typeof window === "undefined") return false;
  if (readNativeFlag()) return true;
  if (readCapacitorIsNative()) return true;
  if (hasCapacitorUserAgent()) return true;
  if (hasCapacitorWebkitBridge()) return true;
  if (hasInjectedApnsToken()) return true;
  const platform = readCapacitorPlatform();
  return platform === "ios" || platform === "android";
}

export function getCapacitorPlatformSync(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const platform = readCapacitorPlatform();
  if (platform === "ios" || platform === "android") return platform;
  if (isCapacitorNativeSync() && typeof navigator !== "undefined") {
    if (/Android/i.test(navigator.userAgent)) return "android";
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  }
  return "web";
}

/** Espera a bridge nativa (site remoto no TestFlight pode injectar tarde). */
export async function waitForCapacitorNative(timeoutMs = 8000): Promise<boolean> {
  if (isCapacitorNativeSync()) return true;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    markCapacitorNativeRuntime();
    if (isCapacitorNativeSync()) return true;
    try {
      const { Capacitor: cap } = await import("@capacitor/core");
      if (cap.isNativePlatform()) {
        markCapacitorNativeRuntime();
        return true;
      }
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
  return isCapacitorNativeSync();
}

/** Arranque: escuta inject nativo e faz polling até a bridge responder. */
export function startCapacitorNativeBootstrap(): void {
  if (typeof window === "undefined" || bootstrapStarted) return;
  bootstrapStarted = true;

  const onNativeSignal = () => markCapacitorNativeRuntime();
  window.addEventListener(NATIVE_RUNTIME_EVENT, onNativeSignal);
  window.addEventListener("kebabturco-apns-token", onNativeSignal);

  markCapacitorNativeRuntime();
  void waitForCapacitorNative(12_000);
}
