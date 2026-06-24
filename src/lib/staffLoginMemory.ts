const STORAGE_KEY = "kebabturco.staffLastLogin";

export type StaffLastLogin = {
  email: string;
  method?: "password" | "google";
  name?: string;
  savedAt?: number;
};

export function saveLastStaffLogin(entry: StaffLastLogin): void {
  const email = entry.email?.trim().toLowerCase();
  if (!email) return;
  try {
    const payload: StaffLastLogin = {
      email,
      method: entry.method,
      name: entry.name?.trim() || undefined,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function loadLastStaffLogin(): StaffLastLogin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffLastLogin;
    if (!parsed?.email || typeof parsed.email !== "string") return null;
    return { ...parsed, email: parsed.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function clearLastStaffLogin(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
