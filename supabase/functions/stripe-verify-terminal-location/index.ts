import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import { verifyTerminalLocationForStore } from "../_shared/stripeTerminalLocation.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertStaffAccess(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: roles } = await service.from("user_roles").select("role").eq("user_id", userId);
  return (roles ?? []).some((r) =>
    ["admin_master", "restaurant_admin", "operator", "cashier", "seller"].includes(r.role as string),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    if (!storeId) {
      return json({ error: "storeId é obrigatório" }, 400);
    }

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
    if (!(await assertStaffAccess(service, userData.user.id))) {
      return json({ error: "Sem permissão" }, 403);
    }

    const outcome = await verifyTerminalLocationForStore(service, storeId);
    return json(outcome, outcome.ok ? 200 : 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao verificar morada do terminal";
    return json({ error: msg }, 500);
  }
});
