import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const store_id = String(body?.store_id ?? "").trim();
    const pin = String(body?.pin ?? "").trim();

    if (!store_id || !UUID_PATTERN.test(store_id)) {
      return new Response(JSON.stringify({ error: "Loja não identificada", code: "INVALID_STORE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PIN_PATTERN.test(pin)) {
      return new Response(JSON.stringify({ error: "Código inválido", code: "INVALID_PIN" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: verified, error: verifyErr } = await admin.rpc("verify_staff_access_pin", {
      _store_id: store_id,
      _pin: pin,
    });

    if (verifyErr) {
      return new Response(JSON.stringify({ error: verifyErr.message, code: "VERIFY_FAILED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = Array.isArray(verified) ? verified[0] : verified;
    if (!row?.user_id) {
      return new Response(JSON.stringify({ error: "Código incorrecto", code: "PIN_MISMATCH" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Utilizador não encontrado", code: "USER_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: linkErr?.message || "Falha ao iniciar sessão", code: "SESSION_FAILED" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        role: row.role,
        user_id: row.user_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, code: "INTERNAL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
