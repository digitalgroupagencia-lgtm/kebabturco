// Chave pública VAPID — segura no frontend (apenas pública).
// Usada como fallback quando VITE_VAPID_PUBLIC_KEY não está definida.
export const VAPID_PUBLIC_KEY_FALLBACK =
  "BAVIdtGVN1TnxJ15C0fY2934DIEjb48x2lNM58ST0YgbbXwOa64mR9mcs33x96u1a75DswvIrJN56aPr2G8smcU";

export type VapidPublicKeySource = "env" | "fallback" | "none";

export function getVapidPublicKeySource(): VapidPublicKeySource {
  const env = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (env && env.trim()) return "env";
  return VAPID_PUBLIC_KEY_FALLBACK ? "fallback" : "none";
}

export function getVapidPublicKey(): string | undefined {
  const env = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (env && env.trim()) return env.trim();
  return VAPID_PUBLIC_KEY_FALLBACK || undefined;
}

/** Formato base64url típico de chave pública VAPID (87 chars uncompressed P-256). */
export function isValidVapidPublicKeyFormat(key: string): boolean {
  if (!key || key.length < 80 || key.length > 100) return false;
  return /^[A-Za-z0-9_-]+$/.test(key);
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
