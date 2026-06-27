import { Capacitor } from "@capacitor/core";

export function isIosNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function isSellerTapToPayDemoPath(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  return path.endsWith("/seller/new") || path.endsWith("/seller/my-orders");
}

/** TestFlight / vídeos Apple / vendedor no browser: ecrã realista sem Stripe Terminal. */
export function isTapToPayVisualDemoMode(): boolean {
  if (isIosNative() && import.meta.env.VITE_TAP_TO_PAY_VISUAL_DEMO === "true") return true;
  if (isSellerTapToPayDemoPath()) return true;
  return false;
}

/** Botões e fluxos Tap to Pay visíveis (iPhone ou demo vendedor). */
export function isTapToPayUiAvailable(): boolean {
  if (isTapToPayVisualDemoMode()) return true;
  if (!isIosNative()) return false;
  return import.meta.env.VITE_IOS_TAP_TO_PAY_ENABLED === "true";
}

/** Cobrança real via Stripe Terminal (não modo demonstração). */
export function isTapToPayRealTerminalMode(): boolean {
  return isIosNative() && import.meta.env.VITE_IOS_TAP_TO_PAY_ENABLED === "true" && !isTapToPayVisualDemoMode();
}
