/**
 * Wake Lock para o tablet Android (APK Capacitor).
 * Mantém a tela acesa enquanto o app estiver aberto, para que o
 * listener de impressão direta nunca seja interrompido por sleep.
 *
 * No-op em web/PWA, não afeta o navegador.
 */
import { Capacitor } from "@capacitor/core";

export async function enableTabletKeepAwake() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.keepAwake();
    // eslint-disable-next-line no-console
    console.log("[KeepAwake] tela do tablet permanecerá acesa");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[KeepAwake] indisponível:", (e as Error)?.message);
  }
}
