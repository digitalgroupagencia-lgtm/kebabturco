import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente com o JWT do chamador para validar quem está chamando
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verifica se o chamador é admin_master
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin_master" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: only admin_master" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, password, full_name, role, tenant_id } = body ?? {};
    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "email, password and role are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const allowedRoles = ["admin_master", "restaurant_admin", "operator", "kitchen", "seller"];
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (role !== "admin_master" && !tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required for this role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cliente admin (precisa antes para checagem de limite)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Se for VENDEDOR, validar limite do plano
    if (role === "seller") {
      const { data: sub } = await admin
        .from("tenant_subscriptions")
        .select("sellers_allowed, sellers_included")
        .eq("tenant_id", tenant_id)
        .maybeSingle();
      const allowed = (sub as any)?.sellers_allowed ?? (sub as any)?.sellers_included ?? 1;
      const { count } = await admin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .eq("role", "seller");
      if ((count ?? 0) >= allowed) {
        return new Response(
          JSON.stringify({ error: `Limite de vendedores atingido (${allowed}). Solicite um upgrade do plano.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0] },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = created.user.id;

    // Insere role
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role,
      tenant_id: role === "admin_master" ? null : tenant_id,
    });
    if (roleErr) {
      // rollback do usuário criado
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Role creation failed: " + roleErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});