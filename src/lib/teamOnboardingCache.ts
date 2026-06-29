import type { StaffLoginMethod, StaffOnboardingInput } from "@/lib/staffOnboardingGuide";

const PREFIX = "kebabturco.teamOnboarding.";

function cacheKey(storeId: string, memberRoleId: string) {
  return `${PREFIX}${storeId}.${memberRoleId}`;
}

export type TeamOnboardingCache = Pick<
  StaffOnboardingInput,
  "name" | "email" | "password" | "role" | "lang" | "paymentCode" | "loginMethod"
>;

export function saveTeamOnboardingCache(
  storeId: string,
  memberRoleId: string,
  data: TeamOnboardingCache,
) {
  try {
    localStorage.setItem(cacheKey(storeId, memberRoleId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadTeamOnboardingCache(
  storeId: string,
  memberRoleId: string,
): TeamOnboardingCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(storeId, memberRoleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamOnboardingCache & { accessPin?: string | null };
    if (!parsed?.email) return null;
    if (!parsed.paymentCode && parsed.accessPin) {
      parsed.paymentCode = parsed.accessPin;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function mergeOnboardingInput(
  member: {
    full_name?: string;
    email?: string;
    role: StaffOnboardingInput["role"];
    preferred_language?: string;
  },
  cache: TeamOnboardingCache | null,
  siteUrl?: string,
): StaffOnboardingInput {
  const lang =
    cache?.lang ??
    (member.preferred_language === "es" ? "es" : member.preferred_language === "pt" ? "pt" : "es");
  const isEs = lang === "es";

  const loginMethod: StaffLoginMethod | undefined = cache?.loginMethod;

  return {
    name: member.full_name || cache?.name || "",
    email: member.email || cache?.email || "",
    password:
      loginMethod === "google"
        ? isEs
          ? "(no necesaria, use Google con el correo de arriba)"
          : "(não é necessária, use Google com o e-mail acima)"
        : cache?.password ||
          (isEs
            ? "(la define el gerente, pida una nueva si la olvidó)"
            : "(definida pelo gerente, peça uma nova se esqueceu)"),
    role: member.role,
    lang,
    siteUrl,
    paymentCode: cache?.paymentCode ?? null,
    loginMethod,
  };
}
