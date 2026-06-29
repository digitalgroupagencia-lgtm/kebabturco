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

  // Equipa: Supabase OAuth directo (evita oauth.lovable.app / State verification failed).
  const redirectTo = staffFlow
    ? `${typeof window !== "undefined" ? window.location.origin : "https://kebabturco.net"}/staff`
    : redirectUri;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { hl: googleLangParam(lang) },
    },
  });
  if (error) throw error;
}
