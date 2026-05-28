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

function generateSecurePassword(): string {
  const partA = crypto.randomUUID().replace(/-/g, "");
  const partB = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `Kt9!${partA}Zq2${partB}`;
}

async function findUserIdByEmail(
  supabaseUrl: string,
  serviceKey: string,
  anonKey: string,
  email: string,
): Promise<string | null> {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: anonKey,
      },
    },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const users = json.users ?? json;
  if (Array.isArray(users) && users[0]?.id) return users[0].id as string;
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
      email,
      full_name,
      role,
      store_id,
      tenant_id,
      access_pin,
      preferred_language,
    } = body ?? {};

    if (!email?.trim() || !store_id || !tenant_id || !access_pin) {
      return new Response(JSON.stringify({ error: "email, store_id, tenant_id e access_pin são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESTAURANT_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Papel inválido para a equipa do restaurante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^\d{6,8}$/.test(String(access_pin))) {
      return new Response(JSON.stringify({ error: "Código deve ter entre 6 e 8 dígitos" }), {
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
      (callerRoles ?? []).some((r) =>
        r.role === "restaurant_admin" || r.role === "manager"
      );

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden: só gerente ou dono pode adicionar membros" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const normalizedEmail = email.trim().toLowerCase();
    let userId: string | null = null;
    let createdNewUser = false;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: generateSecurePassword(),
      email_confirm: true,
      user_metadata: { full_name: full_name?.trim() || normalizedEmail.split("@")[0] },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        userId = await findUserIdByEmail(SUPABASE_URL, SERVICE_KEY, ANON_KEY, normalizedEmail);
        if (!userId) {
          return new Response(JSON.stringify({ error: "Este e-mail já está registado, mas não foi possível associá-lo." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (created.user) {
      userId = created.user.id;
      createdNewUser = true;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Falha ao criar utilizador" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("store_id", store_id)
      .maybeSingle();

    if (existingRole?.id) {
      return new Response(JSON.stringify({ error: "Esta pessoa já faz parte da equipa desta loja." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow, error: roleError } = await userClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        tenant_id,
        store_id,
      })
      .select("id")
      .single();

    if (roleError || !roleRow?.id) {
      if (createdNewUser) await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: roleError?.message || "Erro ao atribuir papel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: pinError } = await userClient.rpc("upsert_staff_access_pin", {
      _user_role_id: roleRow.id,
      _pin: String(access_pin),
    });

    if (pinError) {
      await userClient.from("user_roles").delete().eq("id", roleRow.id);
      if (createdNewUser) await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: pinError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await userClient.from("profiles").upsert(
      {
        user_id: userId,
        full_name: full_name?.trim() || null,
        preferred_language: preferred_language || "es",
      },
      { onConflict: "user_id" },
    );

    return new Response(JSON.stringify({ success: true, user_id: userId, created_new_user: createdNewUser }), {
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
