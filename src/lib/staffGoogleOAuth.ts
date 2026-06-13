import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";

/** Só activar quando Google OAuth estiver configurado no Supabase (Client ID + Secret). */
function useSupabaseGoogleOAuth(): boolean {
  return import.meta.env.VITE_STAFF_GOOGLE_VIA_SUPABASE === "true";
}

function googleLangParam(lang: StaffUiLang): string {
  return lang === "pt" ? "pt" : lang === "en" ? "en" : "es";
}

/** Login Google da equipa — Lovable por defeito (funciona sem secret no Supabase). */
export async function signInStaffWithGoogle(params: {
  redirectUri: string;
  lang: StaffUiLang;
}): Promise<void> {
  const { redirectUri, lang } = params;

  if (useSupabaseGoogleOAuth()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        queryParams: { hl: googleLangParam(lang) },
      },
    });
    if (error) throw error;
    return;
  }

  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
      extraParams: { hl: googleLangParam(lang) },
    });
    if (result.error) throw result.error;
  } catch {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        queryParams: { hl: googleLangParam(lang) },
      },
    });
    if (error) throw error;
  }
}
