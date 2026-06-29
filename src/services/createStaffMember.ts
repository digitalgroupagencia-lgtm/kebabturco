import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import type { StaffRole } from "@/lib/staffPermissions";
import {
  createStaffAuthUserViaRpc,
  repairStaffLoginViaRpc,
  setStaffPasswordViaRpc,
} from "@/services/staffAuthRpc";
import { createStaffMemberViaEdge } from "@/services/staffMemberEdge";

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
    m.includes("email ja registado") ||
    m.includes("duplicate")
  );
}

async function lookupExistingUserId(email: string): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)("lookup_staff_user_by_email", {
    _email: email.trim().toLowerCase(),
  });
  if (error) return null;
  return (data as string | null) ?? null;
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

async function ensureAuthUserWithPassword(
  input: CreateStaffMemberInput,
): Promise<{ userId: string; createdNewUser: boolean }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  let userId = await lookupExistingUserId(email);
  let createdNewUser = false;

  if (userId) {
    if (await setStaffPasswordViaRpc(userId, password)) {
      return { userId, createdNewUser: false };
    }
    if (await repairStaffLoginViaRpc(userId, password)) {
      return { userId, createdNewUser: false };
    }
    throw new Error("STAFF_AUTH_EDGE_FALLBACK");
  }

  const ephemeral = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage,
    },
  });

  const { data: signUpData, error: signUpError } = await ephemeral.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: input.full_name?.trim() || undefined,
        staff_team: true,
      },
    },
  });

  if (!signUpError && signUpData.user?.id) {
    userId = signUpData.user.id;
    createdNewUser = true;
  } else if (signUpError && isAlreadyRegistered(signUpError.message)) {
    userId = await lookupExistingUserId(email);
    if (!userId) {
      throw new Error("Este e-mail já está registado, mas não foi possível associá-lo.");
    }
    await setStaffPasswordViaRpc(userId, password);
  } else if (signUpError) {
    const rpcUserId = await createStaffAuthUserViaRpc(email, password, input.full_name);
    if (rpcUserId) {
      userId = rpcUserId;
      createdNewUser = true;
    } else {
      throw signUpError;
    }
  }

  if (!userId) {
    throw new Error("Falha ao criar utilizador");
  }

  if (!(await canSignInWithPassword(email, password))) {
    const fixed =
      (await setStaffPasswordViaRpc(userId, password)) ||
      (await repairStaffLoginViaRpc(userId, password));
    if (!fixed || !(await canSignInWithPassword(email, password))) {
      throw new Error("STAFF_AUTH_EDGE_FALLBACK");
    }
  }

  return { userId, createdNewUser };
}

/** Cria membro da equipa, utilizador + permissões + login testado. */
export async function createStaffMember(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  try {
    return await createStaffMemberDirect(input);
  } catch (e) {
    if (extractErrorMessage(e) === "STAFF_AUTH_EDGE_FALLBACK") {
      return createStaffMemberViaEdge(input);
    }
    throw e;
  }
}

async function createStaffMemberDirect(
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  const { userId, createdNewUser } = await ensureAuthUserWithPassword(input);

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

  const loginReady = await canSignInWithPassword(input.email, input.password);

  return {
    success: true,
    user_id: userId,
    user_role_id: roleRow.id,
    created_new_user: createdNewUser,
    password_unchanged: false,
    login_ready: loginReady,
  };
}


/** Confirma se e-mail + senha entram na app. */
export async function verifyStaffMemberLogin(email: string, password: string): Promise<boolean> {
  return canSignInWithPassword(email, password);
}
