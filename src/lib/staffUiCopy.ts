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
    instruction: "Introduzca el correo y la contraseña que el restaurante le dio en Equipo.",
    backAria: "Volver",
    submit: "Entrar",
    submitting: "Entrando…",
    loading: "Cargando…",
    emailLabel: "Correo",
    passwordLabel: "Contraseña",
    loginFailed: "Correo o contraseña incorrectos",
    googleDivider: "o",
    googleButton: "Entrar con Google",
    googleSubmitting: "Abriendo Google…",
    googleReturning: "Validando el acceso…",
    googlePendingTitle: "Esperando aprobación",
    googlePendingBody:
      "Entró con Google correctamente. El restaurante debe asignarle un perfil en Equipo antes de abrir el panel.",
    googlePendingHint: "Compruebe de nuevo en unos segundos o actualice la página.",
    googleRejectedTitle: "Acceso no autorizado",
    googleRejectedBody:
      "El restaurante rechazó este acceso con Google. Si cree que es un error, hable con el administrador.",
    googleSignOut: "Salir y usar otra cuenta",
    googleError: "No se pudo entrar con Google",
  },
  pt: {
    title: "Área da equipe",
    subtitle: "Acesso interno — não é para clientes",
    instruction: "Introduza o e-mail e a senha que o restaurante lhe deu na área Equipe.",
    backAria: "Voltar",
    submit: "Entrar",
    submitting: "A entrar…",
    loading: "A carregar…",
    emailLabel: "E-mail",
    passwordLabel: "Senha",
    loginFailed: "E-mail ou senha incorrectos",
    googleDivider: "ou",
    googleButton: "Entrar com Google",
    googleSubmitting: "A abrir Google…",
    googleReturning: "A validar o acesso…",
    googlePendingTitle: "À espera de aprovação",
    googlePendingBody:
      "Entrou com Google com sucesso. O restaurante tem de lhe atribuir uma função em Equipa antes de abrir o painel.",
    googlePendingHint: "Volte a verificar dentro de alguns segundos ou actualize a página.",
    googleRejectedTitle: "Acesso não autorizado",
    googleRejectedBody:
      "O restaurante recusou este acesso com Google. Se acha que é um erro, fale com o administrador.",
    googleSignOut: "Sair e usar outra conta",
    googleError: "Não foi possível entrar com Google",
  },
  en: {
    title: "Team area",
    subtitle: "Internal access — not for customers",
    instruction: "Enter the email and password the restaurant gave you in Team.",
    backAria: "Back",
    submit: "Enter",
    submitting: "Signing in…",
    loading: "Loading…",
    emailLabel: "Email",
    passwordLabel: "Password",
    loginFailed: "Incorrect email or password",
    googleDivider: "or",
    googleButton: "Sign in with Google",
    googleSubmitting: "Opening Google…",
    googleReturning: "Verifying access…",
    googlePendingTitle: "Waiting for approval",
    googlePendingBody:
      "You signed in with Google. The restaurant must assign your role in Team before you can open the panel.",
    googlePendingHint: "Check again in a few seconds or refresh the page.",
    googleRejectedTitle: "Access not authorized",
    googleRejectedBody:
      "The restaurant declined this Google access. Contact the administrator if you think this is a mistake.",
    googleSignOut: "Sign out and use another account",
    googleError: "Could not sign in with Google",
  },
} as const;

export type StaffLoginCopy = (typeof staffLoginCopy)[StaffUiLang];

export function getStaffLoginCopy(lang: StaffUiLang): StaffLoginCopy {
  return staffLoginCopy[lang] ?? staffLoginCopy.es;
}
