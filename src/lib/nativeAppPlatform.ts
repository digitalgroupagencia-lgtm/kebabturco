/** Deteta app instalada no iPhone (Capacitor), não Safari nem browser. */
export function isNativeIOSAppSync(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap?.getPlatform?.() === "ios");
}

export async function isNativeIOSApp(): Promise<boolean> {
  if (isNativeIOSAppSync()) return true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}
