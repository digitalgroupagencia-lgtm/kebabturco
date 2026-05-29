import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const STAFF_RESTAURANT_ROLES = [
  "restaurant_admin",
  "manager",
  "operator",
  "kitchen",
  "cashier",
  "attendant",
  "delivery",
] as const;

export type StaffRestaurantRole = (typeof STAFF_RESTAURANT_ROLES)[number];

export const staffMemberCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...staffMemberCorsHeaders, "Content-Type": "application/json" },
  });
}

function validatePassword(password: string): string | null {
  const p = String(password ?? "").trim();
  if (p.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return "Use letras e números na senha.";
  return null;
}

async function callerCanManageStoreTeam(
  userClient: SupabaseClient,
  callerId: string,
  storeId: string,
): Promise<boolean> {
  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: callerId,
    _role: "admin_master",
  });
  if (isAdmin) return true;

  const { data: callerRoles } = await userClient
    .from("user_roles")
    .select("role, store_id")
    .eq("user_id", callerId)
    .eq("store_id", storeId);

  return (callerRoles ?? []).some((r) => r.role === "restaurant_admin" || r.role === "manager");
}

async function applyStaffPassword(
  admin: SupabaseClient,
  userId: string,
  password: string,
): Promise<{ email: string | null; error: string | null }> {
  const trimmed = String(password).trim();

  const repair = await admin.rpc("manager_repair_staff_login", {
    _user_id: userId,
    _password: trimmed,
  });
  if (!repair.error) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    return { email: userData.user?.email ?? null, error: null };
  }

  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !userData.user?.email) {
    return { email: null, error: "Utilizador não encontrado ou sem e-mail" };
  }

  const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, {
    password: trimmed,
    email_confirm: true,
    user_metadata: {
      ...(userData.user.user_metadata ?? {}),
      staff_team: true,
    },
  });

  if (pwdErr) return { email: userData.user.email, error: pwdErr.message };
  return { email: userData.user.email, error: null };
}

async function verifyPasswordLogin(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<boolean> {
  const probe = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await probe.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: String(password).trim(),
  });
  if (error || !data.session) return false;
  await probe.auth.signOut();
  return true;
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const lookup = await admin.rpc("lookup_staff_user_by_email", { _email: email.trim().toLowerCase() });
  if (!lookup.error && lookup.data) return String(lookup.data);

  const res = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const match = res.data.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  return match?.id ?? null;
}

export async function handleStaffUpdateMember(req: Request, body: Record<string, unknown>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  const user_id = String(body.user_id ?? "");
  const user_role_id = String(body.user_role_id ?? "");
  const store_id = String(body.store_id ?? "");
  const role = String(body.role ?? "");
  const full_name = typeof body.full_name === "string" ? body.full_name : null;
  const preferred_language = typeof body.preferred_language === "string" ? body.preferred_language : "es";
  const password = typeof body.password === "string" ? body.password : "";

  if (!user_id || !user_role_id || !store_id || !role) {
    return json({ error: "user_id, user_role_id, store_id e role são obrigatórios" }, 400);
  }

  if (!STAFF_RESTAURANT_ROLES.includes(role as StaffRestaurantRole)) {
    return json({ error: "Papel inválido" }, 400);
  }

  if (password.trim()) {
    const passwordError = validatePassword(password);
    if (passwordError) return json({ error: passwordError }, 400);
  }

  const { data: canAccess } = await userClient.rpc("user_can_access_store", { _store_id: store_id });
  if (!canAccess) return json({ error: "Forbidden: sem acesso a esta loja" }, 403);

  if (!(await callerCanManageStoreTeam(userClient, user.id, store_id))) {
    return json({ error: "Forbidden" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: targetRole } = await admin
    .from("user_roles")
    .select("id, user_id, store_id")
    .eq("id", user_role_id)
    .eq("store_id", store_id)
    .maybeSingle();

  if (!targetRole || targetRole.user_id !== user_id) {
    return json({ error: "Membro não encontrado nesta loja" }, 404);
  }

  if (password.trim()) {
    const applied = await applyStaffPassword(admin, user_id, password);
    if (applied.error) return json({ error: applied.error }, 400);

    if (applied.email) {
      const loginReady = await verifyPasswordLogin(supabaseUrl, anonKey, applied.email, password);
      if (!loginReady) {
        return json({
          error: "A senha foi guardada, mas o login ainda não responde. Guarde a senha outra vez após Sync + Publish.",
          login_ready: false,
        }, 400);
      }
    }
  }

  const { error: roleError } = await admin.from("user_roles").update({ role }).eq("id", user_role_id);
  if (roleError) return json({ error: roleError.message }, 400);

  await admin.rpc("upsert_staff_profile_by_manager", {
    _user_id: user_id,
    _full_name: full_name?.trim() || null,
    _preferred_language: preferred_language || "es",
  });

  return json({ success: true, login_ready: true });
}

/** Probe-only: verifies manager auth + store access without mutating data. */
export async function handleStaffAuditPing(req: Request, body: Record<string, unknown>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  const store_id = String(body.store_id ?? "");
  if (!store_id) return json({ error: "store_id é obrigatório" }, 400);

  const { data: canAccess } = await userClient.rpc("user_can_access_store", { _store_id: store_id });
  if (!canAccess) return json({ error: "Forbidden: sem acesso a esta loja" }, 403);

  const canManage = await callerCanManageStoreTeam(userClient, user.id, store_id);
  if (!canManage) return json({ error: "Forbidden" }, 403);

  return json({ success: true, audit_ready: true, store_id });
}

export async function handleStaffCreateMember(req: Request, body: Record<string, unknown>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid token" }, 401);

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const full_name = typeof body.full_name === "string" ? body.full_name : null;
  const role = String(body.role ?? "");
  const store_id = String(body.store_id ?? "");
  const tenant_id = String(body.tenant_id ?? "");
  const preferred_language = typeof body.preferred_language === "string" ? body.preferred_language : "es";

  if (!email || !password.trim() || !store_id || !tenant_id) {
    return json({ error: "email, password, store_id e tenant_id são obrigatórios" }, 400);
  }

  const passwordError = validatePassword(password);
  if (passwordError) return json({ error: passwordError }, 400);

  if (!STAFF_RESTAURANT_ROLES.includes(role as StaffRestaurantRole)) {
    return json({ error: "Papel inválido para a equipa do restaurante" }, 400);
  }

  const { data: canAccess } = await userClient.rpc("user_can_access_store", { _store_id: store_id });
  if (!canAccess) return json({ error: "Forbidden: sem acesso a esta loja" }, 403);

  if (!(await callerCanManageStoreTeam(userClient, user.id, store_id))) {
    return json({ error: "Forbidden: só gerente ou dono pode adicionar membros" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const normalizedPassword = password.trim();
  let userId: string | null = null;
  let createdNewUser = false;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: normalizedPassword,
    email_confirm: true,
    user_metadata: {
      full_name: full_name?.trim() || email.split("@")[0],
      staff_team: true,
    },
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      userId = await findUserIdByEmail(admin, email);
      if (!userId) {
        return json({ error: "Este e-mail já está registado, mas não foi possível associá-lo." }, 400);
      }
      const applied = await applyStaffPassword(admin, userId, normalizedPassword);
      if (applied.error) return json({ error: applied.error }, 400);
    } else {
      return json({ error: createErr.message }, 400);
    }
  } else if (created.user) {
    userId = created.user.id;
    createdNewUser = true;
  }

  if (!userId) return json({ error: "Falha ao criar utilizador" }, 400);

  const loginReady = await verifyPasswordLogin(supabaseUrl, anonKey, email, normalizedPassword);
  if (!loginReady) {
    return json({ error: "Utilizador criado, mas o login ainda não responde. Guarde a senha outra vez em Editar membro." }, 400);
  }

  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", store_id)
    .maybeSingle();

  if (existingRole?.id) {
    return json({ error: "Esta pessoa já faz parte da equipa desta loja." }, 400);
  }

  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role, tenant_id, store_id })
    .select("id")
    .single();

  if (roleError || !roleRow?.id) {
    if (createdNewUser) await admin.auth.admin.deleteUser(userId);
    return json({ error: roleError?.message || "Erro ao atribuir papel" }, 400);
  }

  await admin.rpc("upsert_staff_profile_by_manager", {
    _user_id: userId,
    _full_name: full_name?.trim() || null,
    _preferred_language: preferred_language || "es",
  });

  return json({ success: true, user_id: userId, created_new_user: createdNewUser, login_ready: true });
}
