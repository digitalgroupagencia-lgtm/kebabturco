import { supabase } from "@/integrations/supabase/client";
import { markStaffSession } from "@/lib/staffLogin";
import type { StaffRole } from "@/lib/staffPermissions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function isEdgeFunctionUnavailable(message: string): boolean {
  return /failed to send a request|edge function|functions\/v1|fetch failed|networkerror|network request failed/i.test(
    message,
  );
}

async function invokeStaffPinLogin(storeId: string, pin: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/staff-pin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ store_id: storeId, pin }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token_hash?: string;
    role?: StaffRole;
    user_id?: string;
  };

  if (!res.ok) {
    throw new Error(payload.error || "Código incorrecto");
  }

  if (payload.error || !payload.token_hash) {
    throw new Error(payload.error || "Resposta inválida do servidor");
  }

  return payload;
}

async function verifyPinLocally(storeId: string, pin: string) {
  const { data, error } = await (supabase.rpc as any)("verify_staff_access_pin", {
    _store_id: storeId,
    _pin: pin,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id) {
    throw new Error("Código incorrecto");
  }
  return row as { user_id: string; role: StaffRole };
}

/** Inicia sessão com código da equipa — servidor remoto ou validação directa + link mágico. */
export async function loginWithStaffPin(storeId: string, pin: string) {
  let tokenHash: string | undefined;
  let role: StaffRole | null = null;
  let userId: string | undefined;

  try {
    const payload = await invokeStaffPinLogin(storeId, pin);
    tokenHash = payload.token_hash;
    role = (payload.role as StaffRole | undefined) ?? null;
    userId = payload.user_id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isEdgeFunctionUnavailable(msg)) {
      throw e;
    }
    throw new Error(
      "Login por código indisponível no servidor. Peça ao gerente para activar as funções ou use e-mail e senha em /auth.",
    );
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: "magiclink",
  });

  if (otpError) {
    throw new Error(otpError.message || "Não foi possível iniciar sessão");
  }

  markStaffSession();

  return { role, userId: userId ?? null };
}

export async function verifyStaffPinOnly(storeId: string, pin: string) {
  return verifyPinLocally(storeId, pin);
}
