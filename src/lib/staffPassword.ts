type UiLang = "pt" | "es";

const PASSWORD_HINT: Record<UiLang, string> = {
  pt: "Mínimo 8 caracteres, com letras e números. Evite sequências simples (123456, password).",
  es: "Mínimo 8 caracteres, con letras y números. Evite secuencias simples (123456, password).",
};

export function staffPasswordHint(lang: UiLang = "pt"): string {
  return PASSWORD_HINT[lang];
}

/** Validação local antes de enviar ao servidor. */
export function validateStaffPassword(password: string, lang: UiLang = "pt"): string | null {
  const p = password.trim();
  if (p.length < 8) {
    return lang === "es"
      ? "La contraseña debe tener al menos 8 caracteres."
      : "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) {
    return lang === "es"
      ? "Use letras y números en la contraseña."
      : "Use letras e números na senha.";
  }
  if (/^(.)\1+$/.test(p) || /^12345678?$/.test(p) || p.toLowerCase() === "password") {
    return lang === "es"
      ? "Esta contraseña es demasiado simple. Pruebe otra o pulse «Sugerir senha»."
      : "Esta senha é demasiado simples. Tente outra ou clique em «Sugerir senha».";
  }
  return null;
}

/** Gera senha legível para entregar ao funcionário. */
export function suggestStaffPassword(): string {
  const prefix = ["Kebab", "Equipe", "Loja", "Turco"][Math.floor(Math.random() * 4)];
  const digits = String(Math.floor(1000 + Math.random() * 8999));
  return `${prefix}${digits}!`;
}
