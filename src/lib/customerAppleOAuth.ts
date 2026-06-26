import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

/** Entrar com Apple — área do cliente (conta / histórico). */
export async function signInCustomerWithApple(redirectUri: string): Promise<void> {
  try {
    const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: redirectUri });
    if (result.error) throw result.error;
    if (result.redirected) return;
  } catch {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectUri },
    });
    if (error) throw error;
  }
}
