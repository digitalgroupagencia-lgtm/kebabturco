// Chave pública VAPID — segura no frontend (apenas pública).
// Usada como fallback quando VITE_VAPID_PUBLIC_KEY não está definida.
export const VAPID_PUBLIC_KEY_FALLBACK =
  "BBupGLA1DGAfKHpV4Tov41XttV1ZL1L6iW6GMsnfFfLXOnyd1rwq6yJ0mtNcobw_r-2YxQtFg4MPEYGXFeBexUY";

export function getVapidPublicKey(): string | undefined {
  const env = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return env && env.trim() ? env.trim() : VAPID_PUBLIC_KEY_FALLBACK;
}
