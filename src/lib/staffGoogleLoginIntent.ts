const STAFF_GOOGLE_LOGIN_FLAG = "kebab-staff-google-login";
const MAX_AGE_MS = 30 * 60 * 1000;

function readFlag(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STAFF_GOOGLE_LOGIN_FLAG) ?? sessionStorage.getItem(STAFF_GOOGLE_LOGIN_FLAG);
  } catch {
    return null;
  }
}

function writeFlag(value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STAFF_GOOGLE_LOGIN_FLAG, value);
    sessionStorage.setItem(STAFF_GOOGLE_LOGIN_FLAG, value);
  } catch {
    /* ignore */
  }
}

function clearFlag() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STAFF_GOOGLE_LOGIN_FLAG);
    sessionStorage.removeItem(STAFF_GOOGLE_LOGIN_FLAG);
  } catch {
    /* ignore */
  }
}

export function markStaffGoogleLoginIntent(): void {
  writeFlag(String(Date.now()));
}

export function consumeStaffGoogleLoginIntent(): boolean {
  const value = readFlag();
  if (!value) return false;
  clearFlag();
  return true;
}

export function hasStaffGoogleLoginIntent(): boolean {
  const value = readFlag();
  if (!value) return false;
  const age = Date.now() - Number(value);
  if (!Number.isFinite(age) || age > MAX_AGE_MS) {
    clearFlag();
    return false;
  }
  return true;
}

export function clearStaffGoogleLoginIntent(): void {
  clearFlag();
}
