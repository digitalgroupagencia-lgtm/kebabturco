import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { isNetworkOrEdgeUnavailable } from "@/lib/networkErrors";
import type { StaffRole } from "@/lib/staffPermissions";
import type { UpdateStaffMemberInput } from "@/services/updateStaffMember";

export type CreateStaffMemberInput = {
  email: string;
  password: string;
  full_name: string | null;
  role: StaffRole;
  store_id: string;
  tenant_id: string;
  preferred_language: string;
};

export type CreateStaffMemberResult = {
  success: true;
  user_id: string;
  user_role_id?: string;
  created_new_user: boolean;
  password_unchanged?: boolean;
  login_ready: boolean;
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
): Promise<CreateStaffMemberResult | { error: string; httpStatus: number }> {
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
    return { error: extractErrorMessage(e), httpStatus: 0 };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    success?: boolean;
    user_id?: string;
    created_new_user?: boolean;
  };

  if (!res.ok) {
    return { error: payload.error || `Erro ao criar membro (${res.status})`, httpStatus: res.status };
  }

  if (payload.error) {
    return { error: payload.error, httpStatus: res.status };
  }

  if (!payload.success || !payload.user_id) {
    return { error: "Resposta inválida do servidor", httpStatus: res.status };
  }

  return {
    success: true,
    user_id: payload.user_id,
    created_new_user: Boolean(payload.created_new_user),
    login_ready: false,
  };
}

async function invokeUpdateEdge(input: UpdateStaffMemberInput): Promise<void> {
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

  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok || payload.error) {
    throw new Error(payload.error || `Erro ao actualizar membro (${res.status})`);
  }
}

async function lookupExistingUserId(email: string): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)("lookup_staff_user_by_email", {
    _email: email.trim().toLowerCase(),
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

async function fetchUserRoleId(userId: string, storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .maybeSingle();
  return data?.id ?? null;
}

async function upsertStaffProfileByManager(input: CreateStaffMemberInput, userId: string) {
  const { error } = await (supabase.rpc as any)("upsert_staff_profile_by_manager", {
    _user_id: userId,
    _full_name: input.full_name?.trim() || null,
    _preferred_language: input.preferred_language || "es",
  });

  if (error) {
    const msg = extractErrorMessage(error).toLowerCase();
    if (msg.includes("could not find the function") || msg.includes("schema cache")) {
      return;
    }
    throw error;
  }
}

async function canSignInWithPassword(email: string, password: string): Promise<boolean> {
  const ephemeral = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage,
    },
  });

  const { data, error } = await ephemeral.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) return false;

  await ephemeral.auth.signOut();
  return true;
}

/** Garante que e-mail + senha funcionam — usa o servidor (admin) se necessário. */
async function ensureStaffLoginReady(
  input: CreateStaffMemberInput,
  userId: string,
  userRoleId: string,
): Promise<boolean> {
  if (await canSignInWithPassword(input.email, input.password)) {
    return true;
  }

  try {
    await invokeUpdateEdge({
      user_id: userId,
      user_role_id: userRoleId,
      store_id: input.store_id,
      full_name: input.full_name,
      role: input.role,
      preferred_language: input.preferred_language,
      password: input.password,
    });
  } catch {
    return false;
  }

  return canSignInWithPassword(input.email, input.password);
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

  const { data: roleRowId, error: roleError } = await (supabase.rpc as any)("add_team_member_to_store", {
    _user_id: userId,
    _role: input.role,
    _store_id: input.store_id,
    _tenant_id: input.tenant_id,
  });

  let roleRow: { id: string } | null = roleRowId ? { id: roleRowId as string } : null;

  if (roleError) {
    const msg = extractErrorMessage(roleError).toLowerCase();
    if (msg.includes("could not find the function") || msg.includes("schema cache")) {
      const { data: inserted, error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: input.role as any,
          tenant_id: input.tenant_id,
          store_id: input.store_id,
        })
        .select("id")
        .single();
      if (insertError || !inserted?.id) {
        throw insertError ?? roleError;
      }
      roleRow = inserted;
    } else {
      throw roleError;
    }
  }

  if (!roleRow?.id) {
    throw new Error("Erro ao atribuir papel");
  }

  await upsertStaffProfileByManager(input, userId);

  const loginReady = await ensureStaffLoginReady(input, userId, roleRow.id);
  if (!loginReady && !passwordUnchanged) {
    passwordUnchanged = false;
  } else if (!loginReady) {
    passwordUnchanged = true;
  } else {
    passwordUnchanged = false;
  }

  return {
    success: true,
    user_id: userId,
    user_role_id: roleRow.id,
    created_new_user: createdNewUser,
    password_unchanged: passwordUnchanged,
    login_ready: loginReady,
  };
}

/** Só usa fallback local quando o servidor remoto está mesmo indisponível. */
function shouldFallbackToLocalAfterEdge(message: string, httpStatus: number): boolean {
  if (httpStatus === 401 || httpStatus === 403) return false;

  const m = message.toLowerCase();
  const definitive =
    m.includes("já faz parte") ||
    (m.includes("already") && m.includes("equipa")) ||
    m.includes("invalid email") ||
    m.includes("correo inválido") ||
    m.includes("código deve ter") ||
    m.includes("codigo deve ter") ||
    m.includes("access_pin") ||
    (m.includes("weak") && m.includes("password")) ||
    m.includes("senha precisa") ||
    m.includes("signup is disabled") ||
    m.includes("signups not allowed") ||
    m.includes("forbidden") ||
    m.includes("sem permissão");
  if (definitive) return false;

  if (isNetworkOrEdgeUnavailable(message)) return true;
  if (httpStatus === 404 || httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return true;
  }
  if (httpStatus === 500 && !m.includes("já")) return true;
  if (httpStatus === 0) return true;
  return false;
}

/** Cria membro da equipa com conta de login activa (e-mail + senha). */
export async function createStaffMember(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  let edgeError: string | null = null;
  let edgeStatus = 0;

  try {
    const edge = await invokeEdgeFunction(input);
    if (!("error" in edge)) {
      const userRoleId = (await fetchUserRoleId(edge.user_id, input.store_id)) ?? undefined;
      const loginReady = userRoleId
        ? await ensureStaffLoginReady(input, edge.user_id, userRoleId)
        : await canSignInWithPassword(input.email, input.password);

      return {
        ...edge,
        user_role_id: userRoleId,
        login_ready: loginReady,
        password_unchanged: !loginReady,
      };
    }
    edgeError = edge.error;
    edgeStatus = edge.httpStatus;
    if (!shouldFallbackToLocalAfterEdge(edge.error, edge.httpStatus)) {
      throw new Error(edge.error);
    }
  } catch (e) {
    const msg = extractErrorMessage(e);
    if (!edgeError || !shouldFallbackToLocalAfterEdge(edgeError, edgeStatus)) {
      if (!shouldFallbackToLocalAfterEdge(msg, 0)) throw e;
    }
  }

  return createStaffMemberLocally(input);
}

/** Confirma se e-mail + senha entram na app. */
export async function verifyStaffMemberLogin(email: string, password: string): Promise<boolean> {
  return canSignInWithPassword(email, password);
}

/** Repõe a senha via servidor e confirma se o login funciona. */
export async function repairStaffMemberLogin(
  input: UpdateStaffMemberInput & { email: string },
): Promise<boolean> {
  if (!input.password?.trim() || !input.email.trim()) return false;
  try {
    await invokeUpdateEdge(input);
  } catch {
    return false;
  }
  return canSignInWithPassword(input.email, input.password);
}
