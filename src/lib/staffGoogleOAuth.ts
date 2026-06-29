import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { signInWithGoogleOAuth } from "@/lib/googleOAuth";

/** Login Google da equipa, Lovable por defeito (funciona sem secret no Supabase). */
export async function signInStaffWithGoogle(params: {
  redirectUri: string;
  lang: StaffUiLang;
}): Promise<void> {
  await signInWithGoogleOAuth({ ...params, staffFlow: true });
}
