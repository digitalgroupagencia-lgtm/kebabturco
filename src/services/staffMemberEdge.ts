import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import type { CreateStaffMemberInput, CreateStaffMemberResult } from "@/services/createStaffMember";
import { verifyStaffMemberLogin } from "@/services/createStaffMember";
import type { UpdateStaffMemberInput } from "@/services/updateStaffMember";

type StaffServerAction = "staff_update_member" | "staff_create_member";

function edgePayloadError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  return typeof err === "string" && err.trim() ? err.trim() : null;
}

function isMissingStaffServer(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("failed to send a request") ||
    message.includes("failed to fetch") ||
    message.includes("function not found") ||
    message.includes("edge function")
  );
}

async function invokeStaffOnDeployedServer(
  action: StaffServerAction,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const attempts: Array<{ functionName: string; body: Record<string, unknown> }> = [
    { functionName: "stripe-create-payment-intent", body: { action, ...payload } },
    { functionName: "operational-diagnostics", body: { action, ...payload } },
  ];

  if (action === "staff_update_member") {
    attempts.push({ functionName: "update-staff-member", body: payload });
  } else {
    attempts.push({ functionName: "create-staff-member", body: payload });
  }

  let lastError: unknown = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase.functions.invoke(attempt.functionName, {
      body: attempt.body,
    });

    if (error) {
      if (isMissingStaffServer(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }

    const payloadError = edgePayloadError(data);
    if (payloadError) throw new Error(payloadError);

    if ((data as { success?: boolean }).success === true) {
      return (data ?? {}) as Record<string, unknown>;
    }

    if ((data as { ok?: boolean }).ok && attempt.functionName !== "update-staff-member" && attempt.functionName !== "create-staff-member") {
      lastError = new Error("STAFF_SERVER_UNAVAILABLE");
      continue;
    }

    lastError = new Error(extractErrorMessage(data) || "Resposta inválida do servidor");
  }

  throw lastError ?? new Error("STAFF_SERVER_UNAVAILABLE");
}

/** Actualiza membro via servidor já activo na Lovable Cloud. */
export async function updateStaffMemberViaEdge(input: UpdateStaffMemberInput): Promise<void> {
  const data = await invokeStaffOnDeployedServer("staff_update_member", {
    user_id: input.user_id,
    user_role_id: input.user_role_id,
    store_id: input.store_id,
    full_name: input.full_name,
    role: input.role,
    preferred_language: input.preferred_language,
    password: input.password?.trim() || undefined,
  });

  if (!(data as { success?: boolean }).success) {
    throw new Error(extractErrorMessage(data) || "Não foi possível guardar as alterações do membro.");
  }
}

/** Cria membro via servidor já activo na Lovable Cloud. */
export async function createStaffMemberViaEdge(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  const data = await invokeStaffOnDeployedServer("staff_create_member", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    full_name: input.full_name,
    role: input.role,
    store_id: input.store_id,
    tenant_id: input.tenant_id,
    preferred_language: input.preferred_language,
  });

  const userId = (data as { user_id?: string }).user_id;
  if (!userId) {
    throw new Error(extractErrorMessage(data) || "Não foi possível criar o membro da equipa.");
  }

  return {
    success: true,
    user_id: userId,
    created_new_user: Boolean((data as { created_new_user?: boolean }).created_new_user),
    password_unchanged: false,
    login_ready: await verifyStaffMemberLogin(input.email, input.password),
  };
}
