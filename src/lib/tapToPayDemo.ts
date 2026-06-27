import { Capacitor } from "@capacitor/core";

export function isIosNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/** TestFlight / vídeos Apple: ecrã realista sem Stripe Terminal. */
export function isTapToPayVisualDemoMode(): boolean {
  return isIosNative() && import.meta.env.VITE_TAP_TO_PAY_VISUAL_DEMO === "true";
}

/** Botões e fluxos Tap to Pay visíveis na app iPhone. */
export function isTapToPayUiAvailable(): boolean {
  if (!isIosNative()) return false;
  if (import.meta.env.VITE_IOS_TAP_TO_PAY_ENABLED === "true") return true;
  return isTapToPayVisualDemoMode();
}

/** Cobrança real via Stripe Terminal (não modo demonstração). */
export function isTapToPayRealTerminalMode(): boolean {
  return isIosNative() && import.meta.env.VITE_IOS_TAP_TO_PAY_ENABLED === "true" && !isTapToPayVisualDemoMode();
}
