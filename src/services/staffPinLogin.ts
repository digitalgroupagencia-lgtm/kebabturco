import { supabase } from "@/integrations/supabase/client";
import { markStaffSession } from "@/lib/staffLogin";
import type { StaffRole } from "@/lib/staffPermissions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;

function isEdgeFunctionUnavailable(message: string): boolean {
  return /failed to send a request|edge function|functions\/v1|fetch failed|networkerror|network request failed/i.test(
    message,
  );
}

async function invokeStaffPinLogin(storeId: string | null, pin: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/staff-pin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({
      pin: pin.trim(),
      ...(storeId?.trim() ? { store_id: storeId.trim() } : {}),
    }),
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

/** Inicia sessão com código — validação no servidor (RPC + bcrypt). */
export async function loginWithStaffPin(storeId: string | null, pin: string) {
  const trimmedPin = pin.trim();

  if (!PIN_PATTERN.test(trimmedPin)) {
    throw new Error("Código inválido — use 6–10 caracteres com # e números");
  }

  let tokenHash: string | undefined;
  let role: StaffRole | null = null;
  let userId: string | undefined;

  try {
    const payload = await invokeStaffPinLogin(storeId, trimmedPin);
    tokenHash = payload.token_hash;
    role = (payload.role as StaffRole | undefined) ?? null;
    userId = payload.user_id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isEdgeFunctionUnavailable(msg)) {
      throw new Error(
        "Login por código indisponível no servidor. Peça ao gerente para activar as funções ou use e-mail e senha em /auth.",
      );
    }
    throw e instanceof Error ? e : new Error("Código incorrecto");
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

export async function verifyStaffPinOnly(storeId: string | null, pin: string) {
  const payload = await invokeStaffPinLogin(storeId, pin.trim());
  return { user_id: payload.user_id!, role: payload.role as StaffRole };
}
