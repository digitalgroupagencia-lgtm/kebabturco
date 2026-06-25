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

/** Mensagem clara quando o código de pagamento falha no balcão. */
export function explainStaffPinPaymentError(raw: string, lang: UiLang = "es"): string {
  const msg = raw.toLowerCase();
  if (msg.includes("código incorreto") || msg.includes("codigo incorreto") || msg.includes("inativo")) {
    return lang === "pt"
      ? "Código não reconhecido nesta loja. O gerente tem de guardar o código em Equipa → editar membro → Código de pagamento."
      : lang === "en"
        ? "Payment code not recognized for this store. A manager must save it under Team → edit member → Payment code."
        : "Código no reconocido en esta tienda. El gerente debe guardarlo en Equipo → editar miembro → Código de cobro.";
  }
  if (msg.includes("sem permissão") || msg.includes("sem permissao")) {
    return lang === "pt"
      ? "Sem permissão nesta loja. Entre com Google ou email aprovados em Equipa (acesso de teste pendente não serve)."
      : lang === "en"
        ? "No permission for this store. Sign in with Google or email approved in Team, pending test access is not enough."
        : "Sin permiso en esta tienda. Entre con Google o correo aprobado en Equipo, el acceso de prueba pendiente no vale.";
  }
  if (msg.includes("autenticação") || msg.includes("autenticacao")) {
    return lang === "pt"
      ? "Sessão expirada. Saia e entre outra vez no painel (Google ou email oficial)."
      : lang === "en"
        ? "Session expired. Sign out and sign in again (Google or official email)."
        : "Sesión caducada. Salga y entre otra vez (Google o correo oficial).";
  }
  return raw;
}
