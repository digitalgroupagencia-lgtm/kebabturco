/** Extrai o token do QR da mesa (URL completa ou texto com parâmetro t=). */
export function parseMesaQrToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const asUrl = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, window.location.origin);
    const fromParam = asUrl.searchParams.get("t")?.trim();
    if (fromParam) return fromParam;
  } catch {
    /* not a URL */
  }

  const paramMatch = trimmed.match(/[?&]t=([^&\s#]+)/i);
  if (paramMatch?.[1]) return decodeURIComponent(paramMatch[1].trim());

  if (/^[0-9a-f-]{20,}$/i.test(trimmed) || trimmed.length >= 12) {
    return trimmed;
  }

  return null;
}
