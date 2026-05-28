import { supabase } from "@/integrations/supabase/client";
import { setStaffPasswordViaRpc } from "@/services/staffAuthRpc";
import { updateStaffMemberViaEdge } from "@/services/staffMemberEdge";
import type { StaffRole } from "@/lib/staffPermissions";

export type UpdateStaffMemberInput = {
  user_id: string;
  user_role_id: string;
  store_id: string;
  full_name: string | null;
  role: StaffRole;
  preferred_language: string;
  password?: string;
};

async function updateStaffMemberLocally(input: UpdateStaffMemberInput) {
  const { error: profileError } = await (supabase.rpc as any)("upsert_staff_profile_by_manager", {
    _user_id: input.user_id,
    _full_name: input.full_name?.trim() || null,
    _preferred_language: input.preferred_language || "es",
  });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({ role: input.role as any })
    .eq("id", input.user_role_id)
    .eq("store_id", input.store_id);
  if (roleError) throw roleError;
}

/** Actualiza membro da equipa — perfil, papel e senha. */
export async function updateStaffMember(input: UpdateStaffMemberInput): Promise<void> {
  if (input.password?.trim()) {
    const passwordSet = await setStaffPasswordViaRpc(input.user_id, input.password.trim());
    if (!passwordSet) {
      await updateStaffMemberViaEdge(input);
      return;
    }
  }

  await updateStaffMemberLocally(input);
}
