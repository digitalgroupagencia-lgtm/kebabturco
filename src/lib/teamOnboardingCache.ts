import type { StaffOnboardingInput } from "@/lib/staffOnboardingGuide";

const PREFIX = "kebabturco.teamOnboarding.";

function cacheKey(storeId: string, memberRoleId: string) {
  return `${PREFIX}${storeId}.${memberRoleId}`;
}

export type TeamOnboardingCache = Pick<
  StaffOnboardingInput,
  "name" | "email" | "password" | "role" | "lang"
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
    const parsed = JSON.parse(raw) as TeamOnboardingCache;
    if (!parsed?.email) return null;
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

  return {
    name: member.full_name || cache?.name || "",
    email: member.email || cache?.email || "",
    password:
      cache?.password ||
      (isEs
        ? "(igual que al crear — pida al gerente una nueva si la olvidó)"
        : "(igual à de quando criou — peça ao gerente uma nova se esqueceu)"),
    role: member.role,
    lang,
    siteUrl,
  };
}
