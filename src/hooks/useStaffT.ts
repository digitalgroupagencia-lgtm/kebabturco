import { useCallback } from "react";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { staffT, type StaffI18nKey } from "@/lib/staffI18n";

/**
 * Hook reactivo para tradução no painel interno.
 * Re-renderiza automaticamente quando o utilizador troca o idioma
 * (via StaffLanguageToggle → notifyStaffUiLangChange).
 */
export function useStaffT(defaultLang?: "es" | "pt" | "en") {
  const lang = useStaffUiLang(defaultLang);
  const t = useCallback(
    (key: StaffI18nKey, fallback?: string) => staffT(lang, key, fallback),
    [lang],
  );
  return { t, lang };
}
