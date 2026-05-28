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
  },
} as const;

export type StaffLoginCopy = (typeof staffLoginCopy)[StaffUiLang];

export function getStaffLoginCopy(lang: StaffUiLang): StaffLoginCopy {
  return staffLoginCopy[lang] ?? staffLoginCopy.es;
}
