type UiLang = "pt" | "es";

/** PIN da equipa: 6–10 caracteres, pelo menos um dígito e o símbolo # */
export const STAFF_PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;

export function staffAccessPinHint(lang: UiLang = "es"): string {
  return lang === "es"
    ? "6–10 caracteres con números y el símbolo # (ej: 482917#). Evite códigos simples como 123456."
    : "6–10 caracteres com números e o símbolo # (ex: 482917#). Evite códigos simples como 123456.";
}

export function validateStaffAccessPin(pin: string, lang: UiLang = "es"): string | null {
  const p = pin.trim();
  if (!STAFF_PIN_PATTERN.test(p)) {
    return lang === "es"
      ? "El código debe tener 6–10 caracteres, incluir # y números."
      : "O código deve ter 6–10 caracteres, incluir # e números.";
  }
  if (/^#?\d{1,6}#?$/.test(p) && !/(?=.*[2-9])/.test(p.replace(/#/g, ""))) {
    return lang === "es"
      ? "El código es demasiado fácil. Use más dígitos variados y #."
      : "O código é demasiado fácil. Use mais dígitos variados e #.";
  }
  return null;
}

export function suggestStaffAccessPin(): string {
  const digits = String(Math.floor(100000 + Math.random() * 899999));
  return `${digits}#`;
}

export function sanitizeStaffAccessPinInput(raw: string): string {
  return raw.replace(/[^\d#]/g, "").slice(0, 10);
}
