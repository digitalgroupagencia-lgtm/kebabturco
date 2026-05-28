import type { StaffRole } from "@/lib/staffPermissions";
import { RESTAURANT_STAFF_ROLES } from "@/lib/staffPermissions";

export type TeamMemberDraft = {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  language: string;
  accessPin: string;
  updatedAt: number;
};

const STORAGE_VERSION = "v1";

function storageKey(storeId: string): string {
  return `panel.teamMemberDraft.${STORAGE_VERSION}.${storeId}`;
}

function isStaffRole(value: string): value is StaffRole {
  return (RESTAURANT_STAFF_ROLES as readonly string[]).includes(value);
}

export function teamMemberDraftHasContent(draft: Pick<TeamMemberDraft, "name" | "email" | "password" | "accessPin">): boolean {
  return Boolean(
    draft.name.trim() ||
      draft.email.trim() ||
      draft.password.trim() ||
      draft.accessPin.trim(),
  );
}

export function loadTeamMemberDraft(storeId: string): TeamMemberDraft | null {
  if (typeof window === "undefined" || !storeId) return null;
  try {
    const raw = localStorage.getItem(storageKey(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TeamMemberDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    const role = typeof parsed.role === "string" && isStaffRole(parsed.role) ? parsed.role : "operator";
    const draft: TeamMemberDraft = {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      role,
      language: typeof parsed.language === "string" ? parsed.language : "es",
      accessPin: typeof parsed.accessPin === "string" ? parsed.accessPin : "",
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
    return teamMemberDraftHasContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveTeamMemberDraft(
  storeId: string,
  draft: Omit<TeamMemberDraft, "updatedAt">,
): void {
  if (typeof window === "undefined" || !storeId) return;
  if (!teamMemberDraftHasContent(draft)) {
    clearTeamMemberDraft(storeId);
    return;
  }
  try {
    localStorage.setItem(
      storageKey(storeId),
      JSON.stringify({ ...draft, updatedAt: Date.now() } satisfies TeamMemberDraft),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearTeamMemberDraft(storeId: string): void {
  if (typeof window === "undefined" || !storeId) return;
  try {
    localStorage.removeItem(storageKey(storeId));
  } catch {
    // ignore
  }
}
