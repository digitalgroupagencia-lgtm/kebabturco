import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import type { CreateStaffMemberInput, CreateStaffMemberResult } from "@/services/createStaffMember";
import type { UpdateStaffMemberInput } from "@/services/updateStaffMember";

function edgePayloadError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  return typeof err === "string" && err.trim() ? err.trim() : null;
}

/** Actualiza membro via servidor quando a RPC da base de dados ainda não está aplicada. */
export async function updateStaffMemberViaEdge(input: UpdateStaffMemberInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke("update-staff-member", {
    body: {
      user_id: input.user_id,
      user_role_id: input.user_role_id,
      store_id: input.store_id,
      full_name: input.full_name,
      role: input.role,
      preferred_language: input.preferred_language,
      password: input.password?.trim() || undefined,
    },
  });

  if (error) throw error;

  const payloadError = edgePayloadError(data);
  if (payloadError) throw new Error(payloadError);

  if (!(data as { success?: boolean })?.success) {
    throw new Error(extractErrorMessage(data) || "Não foi possível guardar as alterações do membro.");
  }
}

/** Cria membro via servidor quando a RPC da base de dados ainda não está aplicada. */
export async function createStaffMemberViaEdge(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  const { data, error } = await supabase.functions.invoke("create-staff-member", {
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      full_name: input.full_name,
      role: input.role,
      store_id: input.store_id,
      tenant_id: input.tenant_id,
      preferred_language: input.preferred_language,
    },
  });

  if (error) throw error;

  const payloadError = edgePayloadError(data);
  if (payloadError) throw new Error(payloadError);

  const userId = (data as { user_id?: string })?.user_id;
  if (!userId) {
    throw new Error(extractErrorMessage(data) || "Não foi possível criar o membro da equipa.");
  }

  return {
    success: true,
    user_id: userId,
    created_new_user: Boolean((data as { created_new_user?: boolean }).created_new_user),
    password_unchanged: false,
    login_ready: true,
  };
}
