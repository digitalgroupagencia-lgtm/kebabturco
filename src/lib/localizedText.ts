export type AppLang = "pt" | "en" | "es" | "fr";

export const APP_LANGS: readonly AppLang[] = ["pt", "en", "es", "fr"];

const VALID = new Set<string>(APP_LANGS);

export function isAppLang(value: string): value is AppLang {
  return VALID.has(value);
}

export function normalizeActiveLangs(
  primaryRaw: string | null | undefined,
  activeRaw: string[] | null | undefined,
): { primary: AppLang; actives: AppLang[] } {
  const primary = isAppLang(primaryRaw ?? "") ? (primaryRaw as AppLang) : "es";
  const actives = (activeRaw ?? [])
    .filter((l): l is AppLang => isAppLang(l))
    .filter((l, i, arr) => arr.indexOf(l) === i);
  const merged = actives.length ? actives : [primary];
  if (!merged.includes(primary)) merged.unshift(primary);
  return { primary, actives: merged };
}

export function readLocalized(obj: unknown): Partial<Record<AppLang, string>> {
  if (!obj || typeof obj !== "object") return {};
  const record = obj as Record<string, unknown>;
  const out: Partial<Record<AppLang, string>> = {};
  for (const lang of APP_LANGS) {
    const value = record[lang];
    if (typeof value === "string" && value.trim()) out[lang] = value;
  }
  return out;
}

export function pickLocalizedText(
  obj: unknown,
  lang: AppLang,
  primaryLang?: AppLang,
): string {
  const record = readLocalized(obj);
  return (
    record[lang]?.trim() ||
    (primaryLang && record[primaryLang]?.trim()) ||
    record.en?.trim() ||
    record.es?.trim() ||
    record.pt?.trim() ||
    record.fr?.trim() ||
    ""
  );
}

export function buildLocalizedPayload(
  prev: unknown,
  values: Partial<Record<AppLang, string>>,
  requiredLang?: AppLang,
): Record<string, string> | null {
  const merged: Partial<Record<AppLang, string>> = { ...readLocalized(prev) };
  for (const [lang, raw] of Object.entries(values) as [AppLang, string][]) {
    const trimmed = (raw ?? "").trim();
    if (trimmed) merged[lang] = trimmed;
    else delete merged[lang];
  }
  if (requiredLang && !merged[requiredLang]?.trim()) return null;
  return merged as Record<string, string>;
}

export function buildLocalizedPayloadOptional(
  prev: unknown,
  values: Partial<Record<AppLang, string>>,
): Record<string, string> {
  return buildLocalizedPayload(prev, values) ?? {};
}

export function emptyLocalizedValues(): Partial<Record<AppLang, string>> {
  return { pt: "", en: "", es: "", fr: "" };
}

export function pickSourceText(obj: unknown, primaryLang: AppLang): string {
  if (typeof obj === "string") return obj.trim();
  const record = readLocalized(obj);
  return (
    record[primaryLang]?.trim() ||
    record.es?.trim() ||
    record.pt?.trim() ||
    record.en?.trim() ||
    record.fr?.trim() ||
    ""
  );
}

export function buildPrimaryLanguagePayload(
  prev: unknown,
  primaryLang: AppLang,
  value: string,
): Record<string, string> {
  const trimmed = value.trim();
  const merged = { ...readLocalized(prev) };
  for (const lang of APP_LANGS) {
    delete merged[lang];
  }
  if (trimmed) merged[primaryLang] = trimmed;
  return merged as Record<string, string>;
}
