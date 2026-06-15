type UiLang = "pt" | "es";

/** PIN simples (balcão) ou com # (acesso ao painel). */
export const STAFF_PIN_SIMPLE_PATTERN = /^\d{4,8}$/;
export const STAFF_PIN_HASH_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;

export function staffAccessPinHint(lang: UiLang = "es"): string {
  return lang === "es"
    ? "4–8 dígitos (ej: 4829) o 6–10 con # (ej: 482917#). Cada empleado tiene el suyo."
    : "4–8 dígitos (ex: 4829) ou 6–10 com # (ex: 482917#). Cada funcionário tem o seu.";
}

export function validateStaffAccessPin(pin: string, lang: UiLang = "es"): string | null {
  const p = pin.trim();
  if (!STAFF_PIN_SIMPLE_PATTERN.test(p) && !STAFF_PIN_HASH_PATTERN.test(p)) {
    return lang === "es"
      ? "Use 4–8 dígitos o 6–10 caracteres con # y números."
      : "Use 4–8 dígitos ou 6–10 caracteres com # e números.";
  }
  if (STAFF_PIN_SIMPLE_PATTERN.test(p) && /^(\d)\1+$/.test(p)) {
    return lang === "es"
      ? "El código es demasiado fácil. Use dígitos variados."
      : "O código é demasiado fácil. Use dígitos variados.";
  }
  if (STAFF_PIN_HASH_PATTERN.test(p) && /^#?\d{1,6}#?$/.test(p) && !/(?=.*[2-9])/.test(p.replace(/#/g, ""))) {
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
