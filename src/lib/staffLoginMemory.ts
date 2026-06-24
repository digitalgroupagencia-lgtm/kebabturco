const STORAGE_KEY = "kebabturco.staffLastLogin";

export type StaffLastLogin = {
  email: string;
  method?: "password" | "google";
  name?: string;
  savedAt?: number;
};

function parseLastStaffLogin(raw: string | null | undefined): StaffLastLogin | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StaffLastLogin;
    if (!parsed?.email || typeof parsed.email !== "string") return null;
    return { ...parsed, email: parsed.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

function buildLastStaffLoginPayload(entry: StaffLastLogin): StaffLastLogin {
  return {
    email: entry.email.trim().toLowerCase(),
    method: entry.method,
    name: entry.name?.trim() || undefined,
    savedAt: Date.now(),
  };
}

export function saveLastStaffLogin(entry: StaffLastLogin): void {
  const email = entry.email?.trim().toLowerCase();
  if (!email) return;
  const payload = buildLastStaffLoginPayload(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function loadLastStaffLogin(): StaffLastLogin | null {
  try {
    return parseLastStaffLogin(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Re-lê a memória após o arranque (útil na app nativa). */
export async function hydrateLastStaffLogin(): Promise<StaffLastLogin | null> {
  return loadLastStaffLogin();
}

export function clearLastStaffLogin(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
