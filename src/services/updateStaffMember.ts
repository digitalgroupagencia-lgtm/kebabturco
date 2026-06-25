import {
  repairStaffLoginViaRpc,
  setStaffPasswordViaRpc,
} from "@/services/staffAuthRpc";
import { updateStaffMemberViaEdge } from "@/services/staffMemberEdge";
import { verifyStaffMemberLogin } from "@/services/createStaffMember";
import type { StaffRole } from "@/lib/staffPermissions";
import { supabase } from "@/integrations/supabase/client";

export type UpdateStaffMemberInput = {
  user_id: string;
  user_role_id: string;
  store_id: string;
  email?: string | null;
  full_name: string | null;
  role: StaffRole;
  preferred_language: string;
  birth_date?: string | null;
  avatar_url?: string | null;
  password?: string;
};

async function updateStaffMemberLocally(input: UpdateStaffMemberInput) {
  const { error: profileError } = await (supabase.rpc as any)("upsert_staff_profile_by_manager", {
    _user_id: input.user_id,
    _full_name: input.full_name?.trim() || null,
    _preferred_language: input.preferred_language || "es",
    _birth_date: input.birth_date || null,
    _avatar_url: input.avatar_url?.trim() || null,
  });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({ role: input.role as any })
    .eq("id", input.user_role_id)
    .eq("store_id", input.store_id);
  if (roleError) throw roleError;
}

async function assertStaffPasswordLogin(email: string | null | undefined, password: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;

  const loginOk = await verifyStaffMemberLogin(normalizedEmail, password);
  if (!loginOk) {
    throw new Error(
      "LOGIN_NOT_READY: A senha foi guardada, mas o login ainda não responde. Edite o membro na Equipe, guarde a senha outra vez e faça Sync + Publish na Lovable.",
    );
  }
}

async function setPasswordWithRpc(input: UpdateStaffMemberInput, password: string): Promise<boolean> {
  if (await setStaffPasswordViaRpc(input.user_id, password)) {
    await updateStaffMemberLocally(input);
    return true;
  }
  if (await repairStaffLoginViaRpc(input.user_id, password)) {
    await updateStaffMemberLocally(input);
    return true;
  }
  return false;
}

/** Actualiza membro da equipa, perfil, papel e senha, com teste de login. */
export async function updateStaffMember(input: UpdateStaffMemberInput): Promise<void> {
  const password = input.password?.trim();
  if (!password) {
    await updateStaffMemberLocally(input);
    return;
  }

  if (await setPasswordWithRpc(input, password)) {
    await assertStaffPasswordLogin(input.email, password);
    return;
  }

  await updateStaffMemberViaEdge(input);
  await assertStaffPasswordLogin(input.email, password);
}
