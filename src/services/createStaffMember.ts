import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { isNetworkOrEdgeUnavailable } from "@/lib/networkErrors";
import type { StaffRole } from "@/lib/staffPermissions";

export type CreateStaffMemberInput = {
  email: string;
  password: string;
  full_name: string | null;
  role: StaffRole;
  store_id: string;
  tenant_id: string;
  access_pin: string;
  preferred_language: string;
};

export type CreateStaffMemberResult = {
  success: true;
  user_id: string;
  created_new_user: boolean;
  password_unchanged?: boolean;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("already") && (m.includes("registered") || m.includes("exists"))) ||
    m.includes("user already registered") ||
    m.includes("email address is already") ||
    m.includes("duplicate")
  );
}

async function invokeEdgeFunction(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult | { error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? SUPABASE_KEY;

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/create-staff-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(input),
    });
  } catch (e) {
    return { error: extractErrorMessage(e) };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    success?: boolean;
    user_id?: string;
    created_new_user?: boolean;
  };

  if (!res.ok) {
    return { error: payload.error || `Erro ao criar membro (${res.status})` };
  }

  if (payload.error) {
    return { error: payload.error };
  }

  if (!payload.success || !payload.user_id) {
    return { error: "Resposta inválida do servidor" };
  }

  return {
    success: true,
    user_id: payload.user_id,
    created_new_user: Boolean(payload.created_new_user),
  };
}

async function lookupExistingUserId(email: string): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)("lookup_staff_user_by_email", {
    _email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

async function upsertStaffProfileByManager(input: CreateStaffMemberInput, userId: string) {
  const { error } = await (supabase.rpc as any)("upsert_staff_profile_by_manager", {
    _user_id: userId,
    _full_name: input.full_name?.trim() || null,
    _preferred_language: input.preferred_language || "es",
  });

  if (error) {
    // Compatibilidade: se a função ainda não existir na BD, não falha a criação da equipa.
    const msg = extractErrorMessage(error).toLowerCase();
    if (msg.includes("could not find the function") || msg.includes("schema cache")) {
      return;
    }
    throw error;
  }
}

async function createStaffMemberLocally(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  let userId: string | null = null;
  let createdNewUser = false;
  let passwordUnchanged = false;

  const ephemeral = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage,
    },
  });

  const { data: signUpData, error: signUpError } = await ephemeral.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { full_name: input.full_name?.trim() || undefined },
    },
  });

  if (!signUpError && signUpData.user?.id) {
    userId = signUpData.user.id;
    createdNewUser = true;
  } else if (signUpError && isAlreadyRegistered(signUpError.message)) {
    userId = await lookupExistingUserId(input.email);
    if (!userId) {
      throw new Error("Este e-mail já está registado, mas não foi possível associá-lo.");
    }
    passwordUnchanged = true;
  } else if (signUpError) {
    throw signUpError;
  } else if (signUpData.user?.id) {
    userId = signUpData.user.id;
    createdNewUser = true;
  }

  if (!userId) {
    throw new Error("Falha ao criar utilizador");
  }

  const { data: preExistingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", input.store_id)
    .maybeSingle();

  if (preExistingRole?.id) {
    throw new Error("Esta pessoa já faz parte da equipa desta loja.");
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: userId,
      role: input.role as any,
      tenant_id: input.tenant_id,
      store_id: input.store_id,
    })
    .select("id")
    .single();

  if (roleError || !roleRow?.id) {
    throw roleError ?? new Error("Erro ao atribuir papel");
  }

  try {
    const { error: pinError } = await (supabase.rpc as any)("upsert_staff_access_pin", {
      _user_role_id: roleRow.id,
      _pin: input.access_pin,
    });
    if (pinError) throw pinError;
  } catch (e) {
    await supabase.from("user_roles").delete().eq("id", roleRow.id);
    throw e;
  }

  await upsertStaffProfileByManager(input, userId);

  return {
    success: true,
    user_id: userId,
    created_new_user: createdNewUser,
    password_unchanged: passwordUnchanged,
  };
}

/** Cria membro da equipa — tenta servidor remoto e, se indisponível, usa registo directo. */
export async function createStaffMember(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  try {
    const edge = await invokeEdgeFunction(input);
    if ("error" in edge) {
      if (!isNetworkOrEdgeUnavailable(edge.error)) {
        throw new Error(edge.error);
      }
    } else {
      return edge;
    }
  } catch (e) {
    const msg = extractErrorMessage(e);
    if (!isNetworkOrEdgeUnavailable(msg)) throw e;
  }

  return createStaffMemberLocally(input);
}
