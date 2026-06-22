import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/stripePaymentActions.ts";
import { createTerminalLocationForStore } from "../_shared/stripeTerminalLocation.ts";

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

    const { data: stores, error: storesErr } = await service
      .from("stores")
      .select("id, name, stripe_terminal_location_id")
      .eq("is_active", true)
      .not("stripe_connect_account_id", "is", null);

    if (storesErr) {
      return json({ error: storesErr.message }, 500);
    }

    const targets = (stores ?? []).filter((s) => !s.stripe_terminal_location_id?.trim());

    const results: {
      storeId: string;
      name: string;
      ok: boolean;
      locationId?: string;
      created?: boolean;
      error?: string;
    }[] = [];

    for (const store of targets) {
      try {
        const outcome = await createTerminalLocationForStore(service, store.id);
        results.push({
          storeId: store.id,
          name: store.name,
          ok: true,
          locationId: outcome.locationId,
          created: outcome.created,
        });
      } catch (e) {
        results.push({
          storeId: store.id,
          name: store.name,
          ok: false,
          error: e instanceof Error ? e.message : "Erro desconhecido",
        });
      }
    }

    const configured = results.filter((r) => r.ok && r.created).length;
    const skipped = results.filter((r) => r.ok && !r.created).length;
    const failed = results.filter((r) => !r.ok).length;

    return json({
      success: failed === 0,
      configured,
      skipped,
      failed,
      results,
      message:
        failed === 0
          ? `Terminal Location: ${configured} criada(s), ${skipped} já existente(s)`
          : `Concluído com ${failed} falha(s)`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar Terminal Locations";
    return json({ error: msg }, 500);
  }
});
