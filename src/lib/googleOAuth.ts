import { supabase } from "@/integrations/supabase/client";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { markStaffGoogleLoginIntent } from "@/lib/staffGoogleLoginIntent";

function googleLangParam(lang: StaffUiLang): string {
  return lang === "pt" ? "pt" : lang === "en" ? "en" : "es";
}

/** Login com Google, área da equipa (/staff). */
export async function signInWithGoogleOAuth(params: {
  redirectUri: string;
  lang?: StaffUiLang;
  /** Marca intenção de login da equipa (pedido pendente até aprovação). */
  staffFlow?: boolean;
}): Promise<void> {
  const { redirectUri, lang = "pt", staffFlow = false } = params;
  if (staffFlow) markStaffGoogleLoginIntent();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUri,
      queryParams: { hl: googleLangParam(lang) },
    },
  });
  if (error) throw error;
}
