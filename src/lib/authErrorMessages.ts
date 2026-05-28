import { extractErrorMessage } from "@/lib/extractErrorMessage";

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
    pt: "O código deve ter 6–10 caracteres, incluir # e números (ex: 482917#).",
    es: "El código debe tener 6–10 caracteres, incluir # y números (ej: 482917#).",
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
  edge_function_unavailable: {
    pt: "Serviço temporariamente indisponível. A app tentou criar o membro por outro caminho — se o erro persistir, contacte o suporte.",
    es: "Servicio temporalmente no disponible. La app intentó crear el miembro por otra vía — si el error continúa, contacte con soporte.",
  },
  db_function_missing: {
    pt: "Falta actualizar a base de dados da loja. Contacte o suporte ou execute o SQL de equipa na Lovable.",
    es: "Falta actualizar la base de datos de la tienda. Contacte con soporte o ejecute el SQL de equipo en Lovable.",
  },
  rls_denied: {
    pt: "Sem permissão para concluir esta acção. Verifique se está logado como gerente ou dono.",
    es: "Sin permiso para completar esta acción. Compruebe que inició sesión como gerente o dueño.",
  },
  rls_recursion: {
    pt: "Erro na base de dados da loja. Execute o script SQL de correção da equipa na Lovable.",
    es: "Error en la base de datos de la tienda. Ejecute el script SQL de corrección del equipo en Lovable.",
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
  if (m.includes("4 e 8 dígitos") || m.includes("4 e 8 digitos")) return "pin_format";
  if (m.includes("código deve ter") || m.includes("codigo deve ter")) return "pin_format";
  if (m.includes("incluir #") || m.includes("6–10") || m.includes("6-10")) return "pin_format";
  if (m.includes("could not find the function") || m.includes("schema cache")) return "db_function_missing";
  if (m.includes("row-level security") || m.includes("rls")) return "rls_denied";
  if (m.includes("infinite recursion")) return "rls_recursion";
  if (m.includes("sem permissão para definir código")) return "pin_permission";
  if (m.includes("membro da equipe não encontrado") || m.includes("equipe não encontrado")) return "member_not_found";
  if (m.includes("loja inválida")) return "store_invalid";
  if (m.includes("já faz parte") || m.includes("already on team")) return "role_exists";
  if (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("failed to send a request") ||
    m.includes("edge function") ||
    m.includes("networkerror") ||
    m.includes("network request failed")
  ) {
    return "edge_function_unavailable";
  }
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
  return translateAppError(extractErrorMessage(err), lang);
}
