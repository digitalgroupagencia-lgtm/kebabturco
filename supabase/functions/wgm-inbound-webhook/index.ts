import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wgm-signature, x-wgm-event",
};

type InboundPayload = {
  event?: string;
  external_id?: string;
  wgm_order_id?: string;
  old_status?: string;
  new_status?: string;
  status?: string;
  numero?: number;
  timestamp?: string;
};

async function signPayload(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    return json({ ok: true, service: "wgm-inbound-webhook" });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const rawBody = await req.text();
  let payload: InboundPayload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const secret = Deno.env.get("WGM_INBOUND_WEBHOOK_SECRET")?.trim();
  if (secret) {
    const signature = req.headers.get("x-wgm-signature")?.trim();
    if (!signature) {
      return json({ ok: false, error: "missing_signature" }, 401);
    }
    const expected = await signPayload(secret, rawBody);
    if (signature !== expected) {
      return json({ ok: false, error: "invalid_signature" }, 401);
    }
  }

  const externalId = payload.external_id?.trim();
  const status = (payload.status ?? payload.new_status)?.trim();
  if (!externalId || !status) {
    return json({ ok: false, error: "external_id_and_status_required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: cfg } = await supabase
    .from("wgm_integration_config")
    .select("enabled")
    .eq("id", 1)
    .maybeSingle();

  if (!cfg?.enabled) {
    return json({ ok: true, skipped: true, reason: "integration_disabled" });
  }

  const { data, error } = await supabase.rpc("wgm_apply_inbound_status", {
    _external_id: externalId,
    _status: status,
    _wgm_order_id: payload.wgm_order_id ?? null,
    _wgm_order_numero: payload.numero ?? null,
  });

  if (error) {
    console.error("[wgm-inbound-webhook]", error);
    return json({ ok: false, error: error.message }, 500);
  }

  return json({ ok: true, result: data });
});
