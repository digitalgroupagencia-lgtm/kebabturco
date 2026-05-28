import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";

function isMissingRpc(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("could not find the function") || m.includes("schema cache");
}

/** Define ou repõe a senha de um membro da equipa (RPC na base de dados). */
export async function setStaffPasswordViaRpc(userId: string, password: string): Promise<boolean> {
  const { error } = await (supabase.rpc as any)("manager_set_staff_password", {
    _user_id: userId,
    _password: password.trim(),
  });
  if (!error) return true;
  if (isMissingRpc(extractErrorMessage(error))) return false;
  throw error;
}

/** Cria conta auth quando signUp público falha (RPC na base de dados). */
export async function createStaffAuthUserViaRpc(
  email: string,
  password: string,
  fullName: string | null,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)("manager_create_staff_auth_user", {
    _email: email.trim().toLowerCase(),
    _password: password,
    _full_name: fullName?.trim() || null,
  });
  if (!error && data) return String(data);
  if (error && isMissingRpc(extractErrorMessage(error))) return null;
  if (error) throw error;
  return null;
}
