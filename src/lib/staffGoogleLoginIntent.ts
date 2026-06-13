const STAFF_GOOGLE_LOGIN_FLAG = "kebab-staff-google-login";

export function markStaffGoogleLoginIntent(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STAFF_GOOGLE_LOGIN_FLAG, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function consumeStaffGoogleLoginIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = sessionStorage.getItem(STAFF_GOOGLE_LOGIN_FLAG);
    if (!value) return false;
    sessionStorage.removeItem(STAFF_GOOGLE_LOGIN_FLAG);
    return true;
  } catch {
    return false;
  }
}

export function hasStaffGoogleLoginIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(sessionStorage.getItem(STAFF_GOOGLE_LOGIN_FLAG));
  } catch {
    return false;
  }
}
