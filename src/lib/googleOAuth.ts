import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { markStaffGoogleLoginIntent } from "@/lib/staffGoogleLoginIntent";

/** Só activar quando Google OAuth estiver configurado no Supabase (Client ID + Secret). */
function useSupabaseGoogleOAuth(): boolean {
  return import.meta.env.VITE_STAFF_GOOGLE_VIA_SUPABASE === "true";
}

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

  // Equipa: sempre Supabase OAuth (evita oauth.lovable.app / State verification failed).
  const redirectTo = staffFlow
    ? `${typeof window !== "undefined" ? window.location.origin : "https://kebabturco.net"}/staff`
    : redirectUri;

  if (staffFlow || useSupabaseGoogleOAuth()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
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
