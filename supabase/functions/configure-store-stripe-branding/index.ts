import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import { configureStoreBrandingById } from "../_shared/stripeConnectBranding.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertStoreBrandingAccess(
  service: ReturnType<typeof createClient>,
  userId: string,
  storeId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [{ data: roles }, { data: store }] = await Promise.all([
    service.from("user_roles").select("role, tenant_id").eq("user_id", userId),
    service.from("stores").select("tenant_id").eq("id", storeId).maybeSingle(),
  ]);

  const isAdminMaster = (roles ?? []).some((r) => r.role === "admin_master");
  const isRestaurantAdmin = (roles ?? []).some(
    (r) => r.role === "restaurant_admin" && store && r.tenant_id === store.tenant_id,
  );

  if (isAdminMaster || isRestaurantAdmin) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Sem permissão para configurar branding desta loja" };
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
    const access = await assertStoreBrandingAccess(service, userData.user.id, storeId);
    if (!access.ok) {
      return json({ error: access.error }, access.status);
    }

    const outcome = await configureStoreBrandingById(service, storeId, {
      businessName: typeof body?.businessName === "string" ? body.businessName : undefined,
      brandColor: typeof body?.brandColor === "string" ? body.brandColor : undefined,
      iconUrl: typeof body?.iconUrl === "string" ? body.iconUrl : undefined,
      logoUrl: typeof body?.logoUrl === "string" ? body.logoUrl : undefined,
      supportEmail: typeof body?.supportEmail === "string" ? body.supportEmail : undefined,
      businessUrl: typeof body?.businessUrl === "string" ? body.businessUrl : undefined,
    });

    if ("error" in outcome) {
      return json({ success: false, error: outcome.error }, outcome.status ?? 400);
    }

    return json(outcome);
  } catch (err) {
    console.error("[configure-store-stripe-branding]", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno" },
      500,
    );
  }
});
