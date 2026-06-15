type UiLang = "pt" | "es" | "en";

/** PIN simples (balcão) ou com # (acesso ao painel). */
export const STAFF_PIN_SIMPLE_PATTERN = /^\d{4,8}$/;
export const STAFF_PIN_HASH_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;

export function staffAccessPinHint(lang: UiLang = "es"): string {
  if (lang === "en") {
    return "4–8 digits (e.g. 4829) or 6–10 with # (e.g. 482917#). Each employee has their own.";
  }
  return lang === "es"
    ? "4–8 dígitos (ej: 4829) o 6–10 con # (ej: 482917#). Cada empleado tiene el suyo."
    : "4–8 dígitos (ex: 4829) ou 6–10 com # (ex: 482917#). Cada funcionário tem o seu.";
}

export function validateStaffAccessPin(pin: string, lang: UiLang = "es"): string | null {
  const p = pin.trim();
  if (!STAFF_PIN_SIMPLE_PATTERN.test(p) && !STAFF_PIN_HASH_PATTERN.test(p)) {
    if (lang === "en") return "Use 4–8 digits or 6–10 characters with # and numbers.";
    return lang === "es"
      ? "Use 4–8 dígitos o 6–10 caracteres con # y números."
      : "Use 4–8 dígitos ou 6–10 caracteres com # e números.";
  }
  if (STAFF_PIN_SIMPLE_PATTERN.test(p) && /^(\d)\1+$/.test(p)) {
    if (lang === "en") return "The code is too easy. Use varied digits.";
    return lang === "es"
      ? "El código es demasiado fácil. Use dígitos variados."
      : "O código é demasiado fácil. Use dígitos variados.";
  }
  if (STAFF_PIN_HASH_PATTERN.test(p) && /^#?\d{1,6}#?$/.test(p) && !/(?=.*[2-9])/.test(p.replace(/#/g, ""))) {
    if (lang === "en") return "The code is too easy. Use more varied digits and #.";
    return lang === "es"
      ? "El código es demasiado fácil. Use más dígitos variados y #."
      : "O código é demasiado fácil. Use mais dígitos variados e #.";
  }
  return null;
}

export function suggestStaffAccessPin(simple = true): string {
  if (simple) {
    return String(Math.floor(1000 + Math.random() * 8999));
  }
  const digits = String(Math.floor(100000 + Math.random() * 899999));
  return `${digits}#`;
}

export function sanitizeStaffAccessPinInput(raw: string): string {
  return raw.replace(/[^\d#]/g, "").slice(0, 10);
}
