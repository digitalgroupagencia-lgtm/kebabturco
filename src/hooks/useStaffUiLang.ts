import { useEffect, useState } from "react";
import {
  loadStaffUiLang,
  saveStaffUiLang,
  type StaffUiLang,
} from "@/components/StaffLanguageToggle";
import { STAFF_UI_LANG_EVENT } from "@/lib/staffUiCopy";

export function useStaffUiLang(defaultLang: StaffUiLang = "es") {
  const [lang, setLang] = useState<StaffUiLang>(() => loadStaffUiLang() || defaultLang);

  useEffect(() => {
    const saved = loadStaffUiLang();
    if (saved) setLang(saved);
    else if (defaultLang) {
      setLang(defaultLang);
      saveStaffUiLang(defaultLang);
    }
  }, [defaultLang]);

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StaffUiLang>).detail;
      if (next === "es" || next === "pt" || next === "en") setLang(next);
    };
    window.addEventListener(STAFF_UI_LANG_EVENT, handler);
    return () => window.removeEventListener(STAFF_UI_LANG_EVENT, handler);
  }, []);

  return lang;
}
