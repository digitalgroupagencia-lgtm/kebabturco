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
      password,
      access_pin,
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

    if (access_pin?.trim() && !/^(?=.*\d)(?=.*#).{6,10}$/.test(String(access_pin))) {
      return new Response(JSON.stringify({ error: "Código deve ter 6–10 caracteres, incluir # e números" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      const { error: pwdErr } = await admin.auth.admin.updateUserById(user_id, {
        password: String(password).trim(),
      });
      if (pwdErr) {
        return new Response(JSON.stringify({ error: pwdErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

    if (access_pin?.trim()) {
      const { error: pinError } = await admin.rpc("upsert_staff_access_pin", {
        _user_role_id: user_role_id,
        _pin: String(access_pin).trim(),
      });
      if (pinError) {
        return new Response(JSON.stringify({ error: pinError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await admin.rpc("upsert_staff_profile_by_manager", {
      _user_id: user_id,
      _full_name: full_name?.trim() || null,
      _preferred_language: preferred_language || "es",
    });

    return new Response(JSON.stringify({ success: true }), {
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
