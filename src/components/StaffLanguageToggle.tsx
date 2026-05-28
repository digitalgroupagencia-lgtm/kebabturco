import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { notifyStaffUiLangChange } from "@/lib/staffUiCopy";

const STAFF_UI_LANG_KEY = "staff-ui-lang";

const OPTIONS = [
  { value: "es", label: "🇪🇸 Español" },
  { value: "pt", label: "🇧🇷 Português" },
  { value: "en", label: "🇬🇧 English" },
] as const;

export type StaffUiLang = (typeof OPTIONS)[number]["value"];

export function loadStaffUiLang(): StaffUiLang {
  try {
    const raw = localStorage.getItem(STAFF_UI_LANG_KEY);
    if (raw === "pt" || raw === "es" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return "es";
}

export function saveStaffUiLang(lang: StaffUiLang) {
  try {
    localStorage.setItem(STAFF_UI_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

type Props = {
  defaultLang?: StaffUiLang;
  compact?: boolean;
};

const StaffLanguageToggle = ({ defaultLang = "es", compact }: Props) => {
  const { user } = useAuth();
  const [lang, setLang] = useState<StaffUiLang>(() => loadStaffUiLang() || defaultLang);

  useEffect(() => {
    if (defaultLang && !localStorage.getItem(STAFF_UI_LANG_KEY)) {
      setLang(defaultLang);
      saveStaffUiLang(defaultLang);
    }
  }, [defaultLang]);

  const apply = async (next: StaffUiLang) => {
    setLang(next);
    saveStaffUiLang(next);
    notifyStaffUiLangChange(next);
    if (user?.id) {
      await supabase.from("profiles").upsert(
        { user_id: user.id, preferred_language: next },
        { onConflict: "user_id" },
      );
    }
    toast.success(next === "es" ? "Idioma: Español" : next === "pt" ? "Idioma: Português" : "Language: English");
  };

  const current = OPTIONS.find((o) => o.value === lang)?.label ?? "🌐";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="shrink-0" aria-label="Idioma">
          {compact ? <Languages className="h-4 w-4" /> : <span className="text-sm">{current}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => void apply(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StaffLanguageToggle;
