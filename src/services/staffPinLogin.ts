import { supabase } from "@/integrations/supabase/client";
import { markStaffSession } from "@/lib/staffLogin";
import type { StaffRole } from "@/lib/staffPermissions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerifiedPin = { user_id: string; role: StaffRole; store_id?: string };

function isEdgeFunctionUnavailable(message: string): boolean {
  return /failed to send a request|edge function|functions\/v1|fetch failed|networkerror|network request failed/i.test(
    message,
  );
}

function isMissingRpc(message: string): boolean {
  return /could not find the function|schema cache|verify_staff_access_pin_any/i.test(message);
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
      ...(storeId?.trim() && UUID_PATTERN.test(storeId.trim())
        ? { store_id: storeId.trim() }
        : {}),
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

async function verifyPinLocally(storeId: string, pin: string): Promise<VerifiedPin> {
  const { data, error } = await (supabase.rpc as any)("verify_staff_access_pin", {
    _store_id: storeId.trim(),
    _pin: pin.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id) {
    throw new Error("Código incorrecto");
  }
  return row as VerifiedPin;
}

async function verifyPinAnyStore(pin: string): Promise<VerifiedPin> {
  const { data, error } = await (supabase.rpc as any)("verify_staff_access_pin_any", {
    _pin: pin.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id) {
    throw new Error("Código incorrecto");
  }
  return row as VerifiedPin;
}

async function verifyPin(storeId: string | null, pin: string): Promise<VerifiedPin> {
  const trimmedPin = pin.trim();
  const trimmedStoreId = storeId?.trim() ?? "";

  if (trimmedStoreId && UUID_PATTERN.test(trimmedStoreId)) {
    try {
      return await verifyPinLocally(trimmedStoreId, trimmedPin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/código incorrecto|codigo incorrecto|incorrect/i.test(msg)) {
        throw e;
      }
    }
  }

  try {
    return await verifyPinAnyStore(trimmedPin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRpc(msg) && trimmedStoreId && UUID_PATTERN.test(trimmedStoreId)) {
      return verifyPinLocally(trimmedStoreId, trimmedPin);
    }
    if (/crypt|gen_salt|pgcrypto/i.test(msg)) {
      throw new Error("Verificação do código indisponível. Tente de novo dentro de momentos.");
    }
    throw e instanceof Error ? e : new Error("Código incorrecto");
  }
}

/** Inicia sessão com código — a loja é opcional; o código identifica o membro. */
export async function loginWithStaffPin(storeId: string | null, pin: string) {
  const trimmedPin = pin.trim();

  if (!PIN_PATTERN.test(trimmedPin)) {
    throw new Error("Código inválido — use 6–10 caracteres com # e números");
  }

  const verified = await verifyPin(storeId, trimmedPin);

  let tokenHash: string | undefined;
  let role: StaffRole | null = verified.role ?? null;
  let userId: string | undefined = verified.user_id;
  const effectiveStoreId = verified.store_id ?? storeId;

  try {
    const payload = await invokeStaffPinLogin(effectiveStoreId ?? null, trimmedPin);
    tokenHash = payload.token_hash;
    role = (payload.role as StaffRole | undefined) ?? role;
    userId = payload.user_id ?? userId;
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
  return verifyPin(storeId, pin);
}
