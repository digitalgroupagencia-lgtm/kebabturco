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
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "staff-ui-lang" && (e.newValue === "es" || e.newValue === "pt" || e.newValue === "en")) {
        setLang(e.newValue as StaffUiLang);
      }
    };
    window.addEventListener(STAFF_UI_LANG_EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(STAFF_UI_LANG_EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  return lang;
}
