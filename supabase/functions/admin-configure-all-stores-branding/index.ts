import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import { configureAllActiveStoresBranding } from "../_shared/stripeConnectBranding.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Autenticação necessária" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const service = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
    if (!isAdminMaster) {
      return json({ error: "Apenas admin_master pode executar esta acção" }, 403);
    }

    const summary = await configureAllActiveStoresBranding(service);
    return json({
      ...summary,
      message:
        summary.failed === 0
          ? `Branding configurado em ${summary.configured} loja(s)`
          : `Concluído com ${summary.failed} falha(s) em ${summary.configured + summary.failed} loja(s)`,
    });
  } catch (err) {
    console.error("[admin-configure-all-stores-branding]", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno" },
      500,
    );
  }
});
