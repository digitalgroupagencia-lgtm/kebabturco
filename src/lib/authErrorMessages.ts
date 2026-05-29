import { extractErrorMessage } from "@/lib/extractErrorMessage";

type UiLang = "pt" | "es" | "en";

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
    pt: "O servidor da loja ainda não tem a função de senha activa. Faça Sync + Publish na Lovable e tente guardar outra vez.",
    es: "El servidor de la tienda aún no tiene activa la función de contraseña. Haga Sync + Publish en Lovable e intente guardar otra vez.",
  },
  staff_server_unavailable: {
    pt: "Não foi possível ligar ao servidor para guardar a senha. Faça Sync + Publish na Lovable e tente outra vez.",
    es: "No fue posible conectar con el servidor para guardar la contraseña. Haga Sync + Publish en Lovable e intente otra vez.",
  },
  db_function_missing: {
    pt: "Falta activar a encriptação na base de dados da Lovable. Execute o SQL «gen_salt» (Passo 2 + código de acesso) e tente novamente.",
    es: "Falta activar el cifrado en la base de datos de Lovable. Ejecute el SQL «gen_salt» (Paso 2 + código de acceso) e inténtelo de nuevo.",
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
  invalid_credentials: {
    pt: "E-mail ou senha incorrectos. Peça ao gerente para ir à Equipe, editar o membro e guardar a senha outra vez.",
    es: "Correo o contraseña incorrectos. Pida al gerente que vaya a Equipo, edite al miembro y guarde la contraseña otra vez.",
  },
  login_not_ready: {
    pt: "A senha foi guardada, mas o login ainda não responde. Edite o membro na Equipe, guarde a senha outra vez e faça Sync + Publish na Lovable.",
    es: "La contraseña se guardó, pero el inicio de sesión aún no responde. Edite al miembro en Equipo, guarde la contraseña otra vez y haga Sync + Publish en Lovable.",
  },
  email_not_confirmed: {
    pt: "Conta ainda não confirmada. Peça ao gerente para republicar a app na Lovable.",
    es: "Cuenta aún no confirmada. Pida al gerente que vuelva a publicar la app en Lovable.",
  },
};

function detectKey(raw: string): keyof typeof MESSAGES {
  const m = raw.toLowerCase();
  if (m.includes("staff_server_unavailable")) return "staff_server_unavailable";
  if (m.includes("login_not_ready")) return "login_not_ready";
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "invalid_credentials";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) return "email_not_confirmed";
  if (m.includes("weak") && m.includes("password")) return "weak_password";
  if (m.includes("known to be weak") || m.includes("easy to guess")) return "weak_password";
  if (m.includes("password") && (m.includes("short") || m.includes("least"))) return "password_too_short";
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) return "email_in_use";
  if (m.includes("invalid") && m.includes("email")) return "invalid_email";
  if (m.includes("signup") && m.includes("disabled")) return "signup_disabled";
  if (m.includes("signups not allowed")) return "signup_disabled";
  if (m.includes("permission denied")) return "rls_denied";
  if (m.includes("violates row-level security")) return "rls_denied";
  if (m.includes("unauthorized") || m.includes("invalid token")) return "unauthorized";
  if (m.includes("forbidden") || m.includes("sem permissão")) return "forbidden";
  if (m.includes("código já está em uso") || m.includes("already in use")) return "pin_in_use";
  if (m.includes("4 e 8 dígitos") || m.includes("4 e 8 digitos")) return "pin_format";
  if (m.includes("código deve ter") || m.includes("codigo deve ter")) return "pin_format";
  if (m.includes("incluir #") || m.includes("6–10") || m.includes("6-10")) return "pin_format";
  if (m.includes("could not find the function") || m.includes("schema cache")) return "db_function_missing";
  if (m.includes("gen_salt") || m.includes("pgcrypto")) return "db_function_missing";
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
  const trimmed = message.trim();
  if (trimmed.length <= 160 && /[a-záéíóúãõçñ]/i.test(trimmed) && !trimmed.includes("Http") && !trimmed.includes("PGRST")) {
    return trimmed;
  }
  return MESSAGES.generic[lang];
}

export function translateAppErrorFromException(err: unknown, lang: UiLang = "pt"): string {
  return translateAppError(extractErrorMessage(err), lang);
}
