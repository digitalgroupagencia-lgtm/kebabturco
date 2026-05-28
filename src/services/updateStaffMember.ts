import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { isNetworkOrEdgeUnavailable } from "@/lib/networkErrors";
import type { StaffRole } from "@/lib/staffPermissions";

export type UpdateStaffMemberInput = {
  user_id: string;
  user_role_id: string;
  store_id: string;
  full_name: string | null;
  role: StaffRole;
  preferred_language: string;
  password?: string;
  access_pin?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function invokeUpdateEdge(input: UpdateStaffMemberInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? SUPABASE_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/update-staff-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify(input),
  });

  const payload = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };
  if (!res.ok || payload.error) {
    throw new Error(payload.error || `Erro ao actualizar membro (${res.status})`);
  }
}

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

  if (input.access_pin?.trim()) {
    const { error: pinError } = await (supabase.rpc as any)("upsert_staff_access_pin", {
      _user_role_id: input.user_role_id,
      _pin: input.access_pin.trim(),
    });
    if (pinError) throw pinError;
  }
}

/** Actualiza membro da equipa — perfil, papel, código e senha (se indicada). */
export async function updateStaffMember(input: UpdateStaffMemberInput): Promise<void> {
  const hasPassword = Boolean(input.password?.trim());
  const hasPin = Boolean(input.access_pin?.trim());

  if (hasPassword || hasPin) {
    try {
      await invokeUpdateEdge(input);
      return;
    } catch (e) {
      const msg = extractErrorMessage(e);
      if (!isNetworkOrEdgeUnavailable(msg) && !/404|502|503|504|500/i.test(msg)) {
        throw e;
      }
    }
  }

  await updateStaffMemberLocally(input);

  if (hasPassword) {
    throw new Error(
      "Perfil actualizado, mas a senha só pode ser alterada quando o servidor remoto está activo.",
    );
  }
}
