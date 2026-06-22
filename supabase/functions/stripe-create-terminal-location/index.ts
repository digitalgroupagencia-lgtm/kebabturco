import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import { createTerminalLocationForStore } from "../_shared/stripeTerminalLocation.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertAccess(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: roles } = await service.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r) =>
    ["admin_master", "restaurant_admin", "operator", "cashier", "seller"].includes(r.role as string),
  );

  if (allowed) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Sem permissão para configurar Terminal desta loja" };
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
    const access = await assertAccess(service, userData.user.id);
    if (!access.ok) {
      return json({ error: access.error }, access.status);
    }

    const address =
      body?.address && typeof body.address === "object"
        ? {
            line1: typeof body.address.line1 === "string" ? body.address.line1 : undefined,
            city: typeof body.address.city === "string" ? body.address.city : undefined,
            country: typeof body.address.country === "string" ? body.address.country : undefined,
            postal_code: typeof body.address.postal_code === "string" ? body.address.postal_code : undefined,
          }
        : undefined;

    const outcome = await createTerminalLocationForStore(service, storeId, {
      displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
      address,
      force: body?.force === true,
    });

    return json({
      success: true,
      locationId: outcome.locationId,
      displayName: outcome.displayName,
      stripeConnectAccountId: outcome.stripeConnectAccountId,
      created: outcome.created,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar Terminal Location";
    return json({ error: msg }, 500);
  }
});
