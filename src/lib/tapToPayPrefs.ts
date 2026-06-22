const AWARENESS_KEY = "tap_to_pay_awareness_v1";
const EDUCATION_KEY = "tap_to_pay_education_v1";
const ENABLED_KEY = "tap_to_pay_user_enabled_v1";

export function hasSeenTapToPayAwareness(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(AWARENESS_KEY) === "1";
}

export function markTapToPayAwarenessSeen(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AWARENESS_KEY, "1");
}

export function hasSeenTapToPayEducation(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(EDUCATION_KEY) === "1";
}

export function markTapToPayEducationSeen(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(EDUCATION_KEY, "1");
}

export function isTapToPayUserEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setTapToPayUserEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

/** Reset for Apple demo / re-test Terms flow on same device. */
export function resetTapToPayLocalState(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(AWARENESS_KEY);
  localStorage.removeItem(EDUCATION_KEY);
  localStorage.removeItem(ENABLED_KEY);
}
