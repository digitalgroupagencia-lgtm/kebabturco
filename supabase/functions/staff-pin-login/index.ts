/** Versão 2026-06-07 — aceita códigos com # (ex: 256656#). */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerifiedRow = { user_id: string; role: string };

async function verifyPinViaBcrypt(
  admin: SupabaseClient,
  pin: string,
  storeId?: string,
): Promise<VerifiedRow | null> {
  let query = admin
    .from("staff_access_pins")
    .select("user_id, pin_hash, user_role_id, store_id")
    .eq("is_active", true);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) return null;

  for (const row of rows) {
    const hash = String(row.pin_hash ?? "");
    if (!hash.startsWith("$2")) continue;

    try {
      if (!bcrypt.compareSync(pin, hash)) continue;
    } catch {
      continue;
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("id", row.user_role_id)
      .maybeSingle();

    if (!roleRow?.role) continue;

    return { user_id: row.user_id as string, role: roleRow.role as string };
  }

  return null;
}

async function verifyPinViaRpc(
  admin: SupabaseClient,
  pin: string,
  storeId?: string,
): Promise<VerifiedRow | null> {
  if (storeId && UUID_PATTERN.test(storeId)) {
    const scoped = await admin.rpc("verify_staff_access_pin", {
      _store_id: storeId,
      _pin: pin,
    });
    const scopedRow = Array.isArray(scoped.data) ? scoped.data[0] : scoped.data;
    if (!scoped.error && scopedRow?.user_id) {
      return { user_id: scopedRow.user_id, role: scopedRow.role };
    }
  }

  const anyResult = await admin.rpc("verify_staff_access_pin_any", { _pin: pin });
  if (anyResult.error) return null;

  const anyRow = Array.isArray(anyResult.data) ? anyResult.data[0] : anyResult.data;
  if (!anyRow?.user_id) return null;

  return { user_id: anyRow.user_id, role: anyRow.role };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const store_id = String(body?.store_id ?? "").trim();
    const pin = String(body?.pin ?? "").trim();
    const scopedStoreId = store_id && UUID_PATTERN.test(store_id) ? store_id : undefined;

    if (!PIN_PATTERN.test(pin)) {
      return new Response(JSON.stringify({ error: "Código inválido", code: "INVALID_PIN" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let row =
      (await verifyPinViaRpc(admin, pin, scopedStoreId)) ??
      (await verifyPinViaBcrypt(admin, pin, scopedStoreId)) ??
      (scopedStoreId ? await verifyPinViaBcrypt(admin, pin) : null);

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
