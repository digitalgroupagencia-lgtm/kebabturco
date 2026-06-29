// Chave pública VAPID, segura no frontend (apenas pública).
// Deve coincidir exactamente com VAPID_PUBLIC_KEY configurada no servidor de envio.
export const VAPID_PUBLIC_KEY =
  "BGxtrIj6XFsYvJykwBtZHzw6EPNhUYOycKOPi9xwMLfNaf6nl05gjChe1cgUjdY8PI05UwuJ5UPdiyPqag74eK4";

export type VapidPublicKeySource = "app" | "env" | "none";

export function getVapidPublicKeySource(): VapidPublicKeySource {
  if (VAPID_PUBLIC_KEY) return "app";
  const env = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (env && env.trim()) return "env";
  return "none";
}

export function getVapidPublicKey(): string | undefined {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  const env = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (env && env.trim()) return env.trim();
  return undefined;
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
