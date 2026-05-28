type UiLang = "pt" | "es";

const MESSAGES: Record<string, Record<UiLang, string>> = {
  weak_password: {
    pt: "Esta senha é muito comum ou fácil de adivinhar. Use pelo menos 8 caracteres com letras e números, ou clique em «Sugerir senha».",
    es: "Esta contraseña es muy común o fácil de adivinar. Use al menos 8 caracteres con letras y números, o pulse «Sugerir contraseña».",
  },
  password_too_short: {
    pt: "A senha precisa ter pelo menos 8 caracteres.",
    es: "La contraseña debe tener al menos 8 caracteres.",
  },
  email_in_use: {
    pt: "Este e-mail já está registado. Se a pessoa já existir, adiciona-a à equipa com o mesmo e-mail.",
    es: "Este correo ya está registrado. Si la persona ya existe, añádela al equipo con el mismo correo.",
  },
  invalid_email: {
    pt: "E-mail inválido. Verifique o endereço.",
    es: "Correo inválido. Revise la dirección.",
  },
  signup_disabled: {
    pt: "Registo de utilizadores desactivado. Contacte o suporte.",
    es: "Registro de usuarios desactivado. Contacte con soporte.",
  },
  unauthorized: {
    pt: "Sessão expirada. Faça login novamente.",
    es: "Sesión caducada. Inicie sesión de nuevo.",
  },
  forbidden: {
    pt: "Sem permissão para esta acção.",
    es: "Sin permiso para esta acción.",
  },
  pin_in_use: {
    pt: "Este código de acesso já está em uso nesta loja. Escolha outro.",
    es: "Este código de acceso ya está en uso en esta tienda. Elija otro.",
  },
  pin_format: {
    pt: "O código deve ter entre 6 e 8 dígitos numéricos.",
    es: "El código debe tener entre 6 y 8 dígitos numéricos.",
  },
  pin_permission: {
    pt: "Sem permissão para definir o código de acesso.",
    es: "Sin permiso para definir el código de acceso.",
  },
  member_not_found: {
    pt: "Membro da equipa não encontrado.",
    es: "Miembro del equipo no encontrado.",
  },
  store_invalid: {
    pt: "Loja inválida ou inactiva.",
    es: "Tienda inválida o inactiva.",
  },
  role_exists: {
    pt: "Esta pessoa já faz parte da equipa desta loja.",
    es: "Esta persona ya forma parte del equipo de esta tienda.",
  },
  generic: {
    pt: "Não foi possível concluir. Tente novamente.",
    es: "No se pudo completar. Inténtelo de nuevo.",
  },
};

function detectKey(raw: string): keyof typeof MESSAGES {
  const m = raw.toLowerCase();
  if (m.includes("weak") && m.includes("password")) return "weak_password";
  if (m.includes("known to be weak") || m.includes("easy to guess")) return "weak_password";
  if (m.includes("password") && (m.includes("short") || m.includes("least"))) return "password_too_short";
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) return "email_in_use";
  if (m.includes("invalid") && m.includes("email")) return "invalid_email";
  if (m.includes("signup") && m.includes("disabled")) return "signup_disabled";
  if (m.includes("unauthorized") || m.includes("invalid token")) return "unauthorized";
  if (m.includes("forbidden") || m.includes("sem permissão")) return "forbidden";
  if (m.includes("código já está em uso") || m.includes("already in use")) return "pin_in_use";
  if (m.includes("entre 4 e 8") || m.includes("entre 6 e 8") || m.includes("dígitos")) return "pin_format";
  if (m.includes("sem permissão para definir código")) return "pin_permission";
  if (m.includes("membro da equipe não encontrado") || m.includes("equipe não encontrado")) return "member_not_found";
  if (m.includes("loja inválida")) return "store_invalid";
  if (m.includes("já faz parte") || m.includes("already on team")) return "role_exists";
  return "generic";
}

/** Traduz erros técnicos (Supabase/auth/RPC) para PT ou ES. */
export function translateAppError(message: string | null | undefined, lang: UiLang = "pt"): string {
  if (!message?.trim()) return MESSAGES.generic[lang];
  const key = detectKey(message);
  if (key !== "generic") return MESSAGES[key][lang];
  if (/^[a-z\s\-_:.,!?'"]+$/i.test(message) && message.length < 120) {
    return message;
  }
  return MESSAGES.generic[lang];
}

export function translateAppErrorFromException(err: unknown, lang: UiLang = "pt"): string {
  if (err instanceof Error) return translateAppError(err.message, lang);
  if (typeof err === "string") return translateAppError(err, lang);
  return MESSAGES.generic[lang];
}
