import { Capacitor } from "@capacitor/core";

const NATIVE_FLAG_KEY = "__KEBABTURCO_CAPACITOR_NATIVE__";
export const NATIVE_RUNTIME_EVENT = "kebabturco-native-runtime";
const NATIVE_UA_TOKEN = "KebabTurcoCapacitor";

let bootstrapStarted = false;

/** Marca o runtime quando o Capacitor confirma app nativa (como build 10). */
export function markCapacitorNativeRuntime(): void {
  if (typeof window === "undefined") return;
  if (Capacitor.isNativePlatform()) {
    (window as unknown as Record<string, boolean>)[NATIVE_FLAG_KEY] = true;
  }
}

/** Só o iOS injecta isto dentro do IPA — nunca no Chrome do computador. */
export function markNativeRuntimeFromInject(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[NATIVE_FLAG_KEY] = true;
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

function hasKebabCapacitorUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return new RegExp(NATIVE_UA_TOKEN, "i").test(navigator.userAgent);
}

function readCapacitorIsNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * App nativa real — igual build 10, com sinais extra só possíveis dentro do IPA.
 * Nunca marca o Chrome/Safari do computador como telemóvel.
 */
export function isCapacitorNativeSync(): boolean {
  if (readCapacitorIsNative()) return true;
  if (hasInjectedApnsToken()) return true;
  if (hasKebabCapacitorUserAgent()) return true;
  if (readNativeFlag()) return true;
  return false;
}

export function getCapacitorPlatformSync(): "ios" | "android" | "web" {
  if (!isCapacitorNativeSync()) return "web";
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === "ios" || platform === "android") return platform;
  if (typeof navigator !== "undefined") {
    if (/Android/i.test(navigator.userAgent)) return "android";
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  }
  return "web";
}

/** Espera a bridge nativa no TestFlight (site remoto pode injectar tarde). */
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

/** Arranque: escuta inject do iOS e polling da bridge Capacitor. */
export function startCapacitorNativeBootstrap(): void {
  if (typeof window === "undefined" || bootstrapStarted) return;
  bootstrapStarted = true;

  const onNativeSignal = () => markNativeRuntimeFromInject();
  window.addEventListener(NATIVE_RUNTIME_EVENT, onNativeSignal);
  window.addEventListener("kebabturco-apns-token", onNativeSignal);

  markCapacitorNativeRuntime();
  if (readCapacitorIsNative() || hasInjectedApnsToken() || hasKebabCapacitorUserAgent()) {
    void waitForCapacitorNative(12_000);
  }
}
