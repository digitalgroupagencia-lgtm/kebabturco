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
    googleReturningBody:
      "Volvió de Google correctamente. Un momento mientras abrimos el área del equipo.",
    googleReturnSuccess:
      "Cuenta de Google confirmada. Ya está en el área del equipo — espere la aprobación del restaurante.",
    googlePendingTitle: "Esperando aprobación",
    googlePendingBody:
      "Entró con Google correctamente. El restaurante debe asignarle un perfil en Equipo antes de abrir el panel.",
    googlePendingHint: "Compruebe de nuevo en unos segundos o actualice la página.",
    googleRejectedTitle: "Acceso no autorizado",
    googleRejectedBody:
      "El restaurante rechazó este acceso con Google. Si cree que es un error, hable con el administrador.",
    googleSignOut: "Salir y usar otra cuenta",
    googleError: "No se pudo entrar con Google",
    signupInstruction: "Cree su cuenta para acceder al área del equipo.",
    nameLabel: "Nombre",
    signupSubmit: "Crear cuenta",
    signupSubmitting: "Creando cuenta…",
    signupSuccess: "Verifique su email para confirmar el registro.",
    signupToggle: "¿No tiene cuenta?",
    signupLink: "Crear cuenta",
    loginToggle: "¿Ya tiene cuenta?",
    loginLink: "Entrar",
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
    googleReturningBody:
      "Voltou do Google com sucesso. Só um momento enquanto abrimos a área da equipa.",
    googleReturnSuccess:
      "Conta Google confirmada. Já está na área da equipa — aguarde a aprovação do restaurante.",
    googlePendingTitle: "À espera de aprovação",
    googlePendingBody:
      "Entrou com Google com sucesso. O restaurante tem de lhe atribuir uma função em Equipa antes de abrir o painel.",
    googlePendingHint: "Volte a verificar dentro de alguns segundos ou actualize a página.",
    googleRejectedTitle: "Acesso não autorizado",
    googleRejectedBody:
      "O restaurante recusou este acesso com Google. Se acha que é um erro, fale com o administrador.",
    googleSignOut: "Sair e usar outra conta",
    googleError: "Não foi possível entrar com Google",
    signupInstruction: "Crie a sua conta para aceder à área da equipa.",
    nameLabel: "Nome",
    signupSubmit: "Criar conta",
    signupSubmitting: "A criar conta…",
    signupSuccess: "Verifique o e-mail para confirmar o cadastro!",
    signupToggle: "Não tem conta?",
    signupLink: "Criar conta",
    loginToggle: "Já tem conta?",
    loginLink: "Entrar",
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
    googleReturningBody:
      "You returned from Google successfully. One moment while we open the team area.",
    googleReturnSuccess:
      "Google account confirmed. You are in the team area — wait for the restaurant to approve you.",
    googlePendingTitle: "Waiting for approval",
    googlePendingBody:
      "You signed in with Google. The restaurant must assign your role in Team before you can open the panel.",
    googlePendingHint: "Check again in a few seconds or refresh the page.",
    googleRejectedTitle: "Access not authorized",
    googleRejectedBody:
      "The restaurant declined this Google access. Contact the administrator if you think this is a mistake.",
    googleSignOut: "Sign out and use another account",
    googleError: "Could not sign in with Google",
    signupInstruction: "Create your account to access the team area.",
    nameLabel: "Name",
    signupSubmit: "Create account",
    signupSubmitting: "Creating account…",
    signupSuccess: "Check your email to confirm sign-up.",
    signupToggle: "Don't have an account?",
    signupLink: "Create account",
    loginToggle: "Already have an account?",
    loginLink: "Sign in",
  },
} as const; = (typeof staffLoginCopy)[StaffUiLang];

export function getStaffLoginCopy(lang: StaffUiLang): StaffLoginCopy {
  return staffLoginCopy[lang] ?? staffLoginCopy.es;
}
