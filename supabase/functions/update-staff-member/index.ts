import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESTAURANT_ROLES = [
  "restaurant_admin",
  "manager",
  "operator",
  "kitchen",
  "cashier",
  "attendant",
  "delivery",
] as const;

function validatePassword(password: string): string | null {
  const p = String(password ?? "").trim();
  if (p.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return "Use letras e números na senha.";
  return null;
}

async function applyStaffPassword(
  admin: ReturnType<typeof createClient>,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      user_id,
      user_role_id,
      store_id,
      full_name,
      role,
      preferred_language,
      birth_date,
      avatar_url,
      password,
    } = body ?? {};

    if (!user_id || !user_role_id || !store_id || !role) {
      return new Response(JSON.stringify({ error: "user_id, user_role_id, store_id e role são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESTAURANT_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Papel inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password?.trim()) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return new Response(JSON.stringify({ error: passwordError }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: canAccess } = await userClient.rpc("user_can_access_store", { _store_id: store_id });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Forbidden: sem acesso a esta loja" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin_master",
    });
    const { data: callerRoles } = await userClient
      .from("user_roles")
      .select("role, store_id")
      .eq("user_id", user.id)
      .eq("store_id", store_id);

    const canManage =
      isAdmin ||
      (callerRoles ?? []).some((r) => r.role === "restaurant_admin" || r.role === "manager");

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: targetRole } = await admin
      .from("user_roles")
      .select("id, user_id, store_id")
      .eq("id", user_role_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (!targetRole || targetRole.user_id !== user_id) {
      return new Response(JSON.stringify({ error: "Membro não encontrado nesta loja" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password?.trim()) {
      const applied = await applyStaffPassword(admin, user_id, password);
      if (applied.error) {
        return new Response(JSON.stringify({ error: applied.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (applied.email) {
        const loginReady = await verifyPasswordLogin(SUPABASE_URL, ANON_KEY, applied.email, password);
        if (!loginReady) {
          return new Response(
            JSON.stringify({
              error:
                "A senha foi guardada, mas o login ainda não responde. Faça Sync + Publish na Lovable e guarde a senha outra vez.",
              login_ready: false,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const { error: roleError } = await admin
      .from("user_roles")
      .update({ role })
      .eq("id", user_role_id);
    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.rpc("upsert_staff_profile_by_manager", {
      _user_id: user_id,
      _full_name: full_name?.trim() || null,
      _preferred_language: preferred_language || "es",
      _birth_date: birth_date || null,
      _avatar_url: avatar_url?.trim() || null,
    });

    return new Response(JSON.stringify({ success: true, login_ready: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
