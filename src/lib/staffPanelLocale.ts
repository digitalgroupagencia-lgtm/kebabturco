import { loadStaffUiLang, type StaffUiLang } from "@/components/StaffLanguageToggle";
import { staffT, type StaffI18nKey } from "@/lib/staffI18n";

export function resolveStaffPanelLang(lang?: StaffUiLang): StaffUiLang {
  return lang ?? loadStaffUiLang();
}

export function panelT(lang: StaffUiLang | undefined, key: StaffI18nKey, vars?: Record<string, string | number>): string {
  let text = staffT(resolveStaffPanelLang(lang), key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

const LOCALE_BY_LANG: Record<StaffUiLang, string> = {
  es: "es-ES",
  pt: "pt-PT",
  en: "en-GB",
};

export function formatStaffPanelTime(iso: string, lang?: StaffUiLang): string {
  return new Date(iso).toLocaleTimeString(LOCALE_BY_LANG[resolveStaffPanelLang(lang)], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
