import type { StaffUiLang } from "@/components/StaffLanguageToggle";

export const STAFF_UI_LANG_EVENT = "staff-ui-lang-change";

export function notifyStaffUiLangChange(lang: StaffUiLang) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STAFF_UI_LANG_EVENT, { detail: lang }));
}

const staffLoginCopy = {
  es: {
    title: "Área del equipo",
    subtitle: "Acceso interno — no es para clientes",
    instruction: "Introduzca el código que el restaurante creó para usted en Equipo.",
    placeholder: "482917#",
    pinAria: "Código de acceso",
    backAria: "Volver",
    submit: "Entrar",
    submitting: "Entrando…",
    storeMissing: "Tienda no identificada. Actualice la página.",
    storeLoading: "Esperando la tienda…",
    fallbackStore: "No se pudo conectar con el restaurante. Compruebe la red e intente de nuevo.",
    storeRetry: "Reintentar",
    pinInvalid: "Código inválido — use 6–10 caracteres con # y números",
    pinWrong: "Código incorrecto",
    serverUnavailable:
      "El código con # aún no funciona en el servidor. Entre con correo y contraseña abajo, o pida al gerente que publique la app en Lovable.",
    sessionFailed: "No se pudo iniciar sesión",
    invalidStorePin: "Tienda o código no válidos (servidor antiguo — use correo y contraseña abajo)",
    emailDivider: "O entre con correo y contraseña",
    emailLabel: "Correo",
    passwordLabel: "Contraseña",
    emailSubmit: "Entrar con correo",
    emailSubmitting: "Entrando…",
    emailFailed: "Correo o contraseña incorrectos",
  },
  pt: {
    title: "Área da equipe",
    subtitle: "Acesso interno — não é para clientes",
    instruction: "Digite o código que o restaurante criou para si na área Equipe.",
    placeholder: "482917#",
    pinAria: "Código de acesso",
    backAria: "Voltar",
    submit: "Entrar",
    submitting: "A entrar…",
    storeMissing: "Loja não identificada. Actualize a página.",
    storeLoading: "A carregar loja…",
    fallbackStore: "Não foi possível ligar ao restaurante. Verifique a rede e tente novamente.",
    storeRetry: "Tentar de novo",
    pinInvalid: "Código inválido — use 6–10 caracteres com # e números",
    pinWrong: "Código incorrecto",
    serverUnavailable:
      "O código com # ainda não funciona no servidor. Entre com e-mail e senha abaixo, ou peça ao gerente para publicar a app na Lovable.",
    sessionFailed: "Não foi possível iniciar sessão",
    invalidStorePin: "Loja e código inválidos (servidor antigo — use e-mail e senha abaixo)",
    emailDivider: "Ou entre com e-mail e senha",
    emailLabel: "E-mail",
    passwordLabel: "Senha",
    emailSubmit: "Entrar com e-mail",
    emailSubmitting: "A entrar…",
    emailFailed: "E-mail ou senha incorrectos",
  },
  en: {
    title: "Team area",
    subtitle: "Internal access — not for customers",
    instruction: "Enter the code the restaurant created for you in Team.",
    placeholder: "482917#",
    pinAria: "Access code",
    backAria: "Back",
    submit: "Enter",
    submitting: "Signing in…",
    storeMissing: "Store not identified. Refresh the page.",
    storeLoading: "Loading store…",
    fallbackStore: "Could not connect to the restaurant. Check your network and try again.",
    storeRetry: "Try again",
    pinInvalid: "Invalid code — use 6–10 characters with # and numbers",
    pinWrong: "Incorrect code",
    serverUnavailable:
      "Code login unavailable. Ask the manager to enable server functions or use email and password at /auth.",
    sessionFailed: "Could not sign in",
    invalidStorePin: "Invalid store or code",
    emailDivider: "Or sign in with email and password",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailSubmit: "Sign in with email",
    emailSubmitting: "Signing in…",
    emailFailed: "Incorrect email or password",
  },
} as const;

export type StaffLoginCopy = (typeof staffLoginCopy)[StaffUiLang];

export function getStaffLoginCopy(lang: StaffUiLang): StaffLoginCopy {
  return staffLoginCopy[lang] ?? staffLoginCopy.es;
}

export function mapStaffPinError(message: string, lang: StaffUiLang): string {
  const copy = getStaffLoginCopy(lang);
  const m = message.toLowerCase();
  if (m.includes("loja não identificada") || m.includes("tienda no identificada") || m.includes("store not identified")) {
    return copy.storeMissing;
  }
  if (m.includes("loja e código") || m.includes("tienda o código") || m.includes("invalid store")) {
    return copy.serverUnavailable;
  }
  if (m.includes("server_outdated")) {
    return copy.serverUnavailable;
  }
  if (m.includes("código inválido") || m.includes("codigo invalido") || m.includes("invalid code")) {
    return copy.pinInvalid;
  }
  if (m.includes("código incorrecto") || m.includes("codigo incorrecto") || m.includes("incorrect code")) {
    return copy.pinWrong;
  }
  if (m.includes("indisponível") || m.includes("unavailable") || m.includes("no disponible")) {
    return copy.serverUnavailable;
  }
  if (m.includes("não foi possível iniciar") || m.includes("no se pudo iniciar") || m.includes("could not sign in")) {
    return copy.sessionFailed;
  }
  return message;
}
