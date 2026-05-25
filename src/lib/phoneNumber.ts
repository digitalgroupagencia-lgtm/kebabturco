export type DialOption = { code: string; label: string; flag: string };

/** Indicativos mais usados na loja (Espanha por defeito). */
export const DIAL_OPTIONS: DialOption[] = [
  { code: "+34", label: "España", flag: "🇪🇸" },
  { code: "+351", label: "Portugal", flag: "🇵🇹" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+39", label: "Italia", flag: "🇮🇹" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+49", label: "Deutschland", flag: "🇩🇪" },
  { code: "+55", label: "Brasil", flag: "🇧🇷" },
  { code: "+212", label: "Maroc", flag: "🇲🇦" },
  { code: "+40", label: "România", flag: "🇷🇴" },
];

export const DEFAULT_DIAL_CODE = "+34";

export function sanitizeLocalPhone(value: string, maxLen = 15): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

export function formatFullPhone(dialCode: string, localNumber: string): string {
  const digits = sanitizeLocalPhone(localNumber);
  const code = dialCode.trim().startsWith("+") ? dialCode.trim() : `+${dialCode.trim()}`;
  if (!digits) return "";
  return `${code}${digits}`;
}

export function normalizeStoredPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function isValidCustomerPhone(dialCode: string, localNumber: string): boolean {
  const local = sanitizeLocalPhone(localNumber);
  if (local.length < 6) return false;
  if (dialCode === "+34") return local.length >= 9;
  return local.length >= 6;
}

export function parseStoredPhone(full: string): { dialCode: string; local: string } {
  const normalized = normalizeStoredPhone(full);
  if (!normalized) return { dialCode: DEFAULT_DIAL_CODE, local: "" };

  const match = DIAL_OPTIONS.map((o) => o.code)
    .sort((a, b) => b.length - a.length)
    .find((code) => normalized.startsWith(code));

  if (match) {
    return {
      dialCode: match,
      local: normalized.slice(match.length),
    };
  }

  return { dialCode: DEFAULT_DIAL_CODE, local: normalized.replace(/^\+/, "") };
}
