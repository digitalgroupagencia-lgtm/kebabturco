import { Capacitor } from "@capacitor/core";

export function isIosNativeApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/** Após login com senha, o iOS precisa de um instante antes de navegar para mostrar «Guardar palavra-passe?». */
let passwordSaveGraceUntil = 0;

export function markIosPasswordLoginSubmitted(): void {
  if (!isIosNativeApp()) return;
  passwordSaveGraceUntil = Date.now() + 1500;
}

export async function waitForIosPasswordSaveGrace(): Promise<void> {
  if (!isIosNativeApp()) return;
  const remaining = passwordSaveGraceUntil - Date.now();
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export function staffLoginFormAction(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/staff`;
  }
  return "https://kebabturco.net/staff";
}
