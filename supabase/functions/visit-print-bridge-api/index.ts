import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-visit-bridge-token",
};

type Body = {
  action?: string;
  owner_user_id?: string;
  limit?: number;
  job_id?: string;
  error?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized(msg: string) {
  return json({ ok: false, error: msg }, 401);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    return json({ ok: true, service: "visit-print-bridge-api" });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expected = Deno.env.get("VISIT_BRIDGE_TOKEN")?.trim();
  const token = req.headers.get("x-visit-bridge-token")?.trim();
  if (!expected || !token || token !== expected) {
    return unauthorized("Token de bridge inválido ou não configurado no servidor");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "Servidor sem credenciais Supabase" }, 500);
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const ownerId = body.owner_user_id?.trim();
  if (!ownerId) {
    return json({ ok: false, error: "owner_user_id obrigatório" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const action = body.action ?? "claim";

  if (action === "heartbeat") {
    const { error } = await supabase.rpc("upsert_visit_print_bridge_heartbeat", {
      _owner_user_id: ownerId,
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "claim") {
    const limit = Math.min(Math.max(body.limit ?? 3, 1), 10);
    const { data, error } = await supabase.rpc("claim_visit_print_jobs", {
      _owner_user_id: ownerId,
      _limit: limit,
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, jobs: data ?? [] });
  }

  if (action === "complete") {
    const jobId = body.job_id?.trim();
    if (!jobId) return json({ ok: false, error: "job_id obrigatório" }, 400);
    const { error } = await supabase
      .from("print_jobs")
      .update({
        status: "printed",
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId)
      .eq("visit_owner_id", ownerId)
      .eq("is_visit_demo", true);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "fail") {
    const jobId = body.job_id?.trim();
    if (!jobId) return json({ ok: false, error: "job_id obrigatório" }, 400);
    const msg = (body.error ?? "erro desconhecido").slice(0, 500);
    const { error } = await supabase
      .from("print_jobs")
      .update({
        status: "failed",
        error_message: `[visit-bridge] ${msg}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("visit_owner_id", ownerId)
      .eq("is_visit_demo", true);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, error: "action inválida" }, 400);
});
