import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/lib/staffPermissions";

export type StoreTeamMemberRow = {
  user_role_id: string;
  user_id: string;
  role: StaffRole;
  email: string | null;
  full_name: string | null;
  preferred_language: string | null;
  birth_date: string | null;
  avatar_url: string | null;
};

export type SaveTeamMemberResult = {
  success: boolean;
  user_role_id: string;
  user_id: string;
  full_name: string | null;
  preferred_language: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  role: string | null;
};

export async function fetchStoreTeamMembers(storeId: string): Promise<StoreTeamMemberRow[]> {
  const { data, error } = await supabase.rpc("get_store_team_members", {
    _store_id: storeId,
  });
  if (error) throw error;
  return (data ?? []) as StoreTeamMemberRow[];
}

export async function saveTeamMemberByManager(input: {
  storeId: string;
  userRoleId: string;
  userId: string;
  fullName: string;
  preferredLanguage: string;
  birthDate?: string | null;
  role?: StaffRole;
  accessPin?: string | null;
}): Promise<SaveTeamMemberResult> {
  const { data, error } = await supabase.rpc("save_team_member_by_manager", {
    _store_id: input.storeId,
    _user_role_id: input.userRoleId,
    _user_id: input.userId,
    _full_name: input.fullName.trim(),
    _preferred_language: input.preferredLanguage || "es",
    _birth_date: input.birthDate || undefined,
    _role: input.role ?? undefined,
    _access_pin: input.accessPin?.trim() || undefined,
  });
  if (error) throw error;
  const row = data as SaveTeamMemberResult | null;
  if (!row?.success) {
    throw new Error("Não foi possível guardar os dados do membro da equipa");
  }
  return row;
}
