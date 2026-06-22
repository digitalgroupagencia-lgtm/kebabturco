/** Valida email opcional no checkout (vazio = ok). */
export function isValidOptionalEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function normalizeOptionalEmail(email: string | null | undefined): string | null {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  return isValidOptionalEmail(trimmed) ? trimmed : null;
}
