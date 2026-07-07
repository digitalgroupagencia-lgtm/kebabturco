import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIN_PATTERN = /^\d{4,8}$/;
const STAFF_PIN_ROLES = [
  "seller",
  "restaurant_admin",
  "manager",
  "operator",
  "kitchen",
  "cashier",
  "attendant",
] as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pinInUseAtStore(
  rows: { pin_hash: string; user_role_id: string }[],
  pin: string,
  excludeRoleId: string,
): boolean {
  for (const row of rows) {
    if (row.user_role_id === excludeRoleId) continue;
    const hash = String(row.pin_hash ?? "");
    if (!hash.startsWith("$2")) continue;
    try {
      if (bcrypt.compareSync(pin, hash)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name ?? "").trim();
    const birthDate = body.birth_date ? String(body.birth_date).trim() : null;
    const pin = String(body.pin ?? "").trim();

    if (fullName.length < 2) {
      return json({ error: "Nome obrigatório" }, 400);
    }
    if (!PIN_PATTERN.test(pin)) {
      return json({ error: "Código deve ter entre 4 e 8 dígitos" }, 400);
    }
    if (/^(\d)\1+$/.test(pin)) {
      return json({ error: "Código demasiado fácil" }, 400);
    }

    const { data: staffRoles, error: roleErr } = await admin
      .from("user_roles")
      .select("id, store_id, role")
      .eq("user_id", user.id)
      .in("role", [...STAFF_PIN_ROLES])
      .not("store_id", "is", null)
      .order("created_at", { ascending: true });

    if (roleErr) {
      return json({ error: roleErr.message }, 500);
    }

    const staffRole =
      staffRoles?.find((row) => row.role === "seller") ??
      staffRoles?.[0] ??
      null;

    if (!staffRole?.store_id || !staffRole.id) {
      const { data: isMaster } = await admin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin_master",
      });
      if (isMaster) {
        const { error: profileOnlyErr } = await userClient.rpc("upsert_my_staff_profile", {
          _full_name: fullName,
          _birth_date: birthDate || undefined,
        });
        if (profileOnlyErr) {
          return json({ error: profileOnlyErr.message }, 400);
        }
        return json({ success: true, skipped_pin: true });
      }
      return json({ error: "Perfil de equipa não encontrado nesta loja" }, 403);
    }

    const { error: profileErr } = await userClient.rpc("upsert_my_staff_profile", {
      _full_name: fullName,
      _birth_date: birthDate || undefined,
    });
    if (profileErr) {
      return json({ error: profileErr.message }, 400);
    }

    const { data: storePins } = await admin
      .from("staff_access_pins")
      .select("pin_hash, user_role_id")
      .eq("store_id", staffRole.store_id)
      .eq("is_active", true);

    if (pinInUseAtStore(storePins ?? [], pin, staffRole.id)) {
      return json({ error: "Este código já está em uso nesta loja" }, 400);
    }

    const pinHash = bcrypt.hashSync(pin, 6);

    const { error: pinErr } = await admin.from("staff_access_pins").upsert(
      {
        store_id: staffRole.store_id,
        user_id: user.id,
        user_role_id: staffRole.id,
        pin_hash: pinHash,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_role_id" },
    );

    if (pinErr) {
      console.error("[seller-complete-onboarding] pin upsert failed", pinErr);
      return json({ error: pinErr.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("[seller-complete-onboarding]", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
