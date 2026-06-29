/** Browser / Capacitor device language tag (e.g. pt-PT, es-ES, en-US). */
export function getDeviceLocaleTag(): string {
  if (typeof navigator === "undefined") return "es";
  return navigator.language || (navigator.languages?.[0] ?? "es");
}
