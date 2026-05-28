import { supabase } from "@/integrations/supabase/client";
import { markStaffSession } from "@/lib/staffLogin";
import {
  readSavedStaffLoginStoreId,
  resolveStaffLoginStoreId,
} from "@/lib/resolveStaffLoginStore";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";
import type { StaffRole } from "@/lib/staffPermissions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PIN_PATTERN = /^(?=.*\d)(?=.*#).{6,10}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Função nova (aceita #). A antiga staff-pin-login rejeita códigos com #. */
const PRIMARY_LOGIN_FUNCTION = "staff-access-login";
const LEGACY_LOGIN_FUNCTION = "staff-pin-login";

type VerifiedPin = { user_id: string; role: StaffRole; store_id?: string; email?: string };

export class StaffPinLoginHintError extends Error {
  email?: string;

  constructor(email?: string) {
    super("SERVER_OUTDATED");
    this.name = "StaffPinLoginHintError";
    this.email = email;
  }
}

function isEdgeFunctionUnavailable(message: string): boolean {
  return /failed to send a request|edge function|functions\/v1|fetch failed|networkerror|network request failed/i.test(
    message,
  );
}

function isWrongPinMessage(message: string): boolean {
  return /código incorrecto|codigo incorrecto|incorrect code|pin_mismatch/i.test(message);
}

/** Resposta típica do servidor antigo — não aceita códigos com #. */
export function isStaleStaffPinServerError(message: string, pin: string): boolean {
  if (!pin.includes("#")) return false;
  return /loja e código|tienda o código|invalid store and code|invalid store or code/i.test(message);
}

async function listCandidateStoreIds(hint: string | null): Promise<string[]> {
  const ids = new Set<string>();

  const add = (id: string | null | undefined) => {
    const value = id?.trim();
    if (value && UUID_PATTERN.test(value) && !isEmergencyFallbackStoreId(value)) {
      ids.add(value);
    }
  };

  add(hint);
  add(readSavedStaffLoginStoreId());
  add(await resolveStaffLoginStoreId());

  const { data: publicStores } = await supabase
    .from("stores_public")
    .select("id")
    .eq("is_active", true);
  publicStores?.forEach((row) => add(row.id));

  const { data: legacyStores } = await supabase.from("stores").select("id").eq("is_active", true);
  legacyStores?.forEach((row) => add(row.id));

  try {
    const { data: rpcStore } = await (supabase.rpc as any)("get_staff_login_store_id");
    add(typeof rpcStore === "string" ? rpcStore : rpcStore ? String(rpcStore) : null);
  } catch {
    /* RPC opcional */
  }

  return [...ids];
}

async function lookupStaffByPin(pin: string): Promise<VerifiedPin | null> {
  const trimmedPin = pin.trim();

  const { data, error } = await (supabase.rpc as any)("lookup_staff_by_pin", {
    _pin: trimmedPin,
  });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.user_id) {
      return {
        user_id: row.user_id,
        role: row.role,
        store_id: row.store_id,
        email: row.email,
      };
    }
  }

  return verifyPinOnClient(trimmedPin);
}

async function verifyPinOnClient(pin: string, storeId?: string): Promise<VerifiedPin | null> {
  const trimmedPin = pin.trim();

  if (storeId && UUID_PATTERN.test(storeId)) {
    const { data, error } = await (supabase.rpc as any)("verify_staff_access_pin", {
      _store_id: storeId,
      _pin: trimmedPin,
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.user_id) {
        return { user_id: row.user_id, role: row.role, store_id: storeId };
      }
    }
  }

  const { data, error } = await (supabase.rpc as any)("verify_staff_access_pin_any", {
    _pin: trimmedPin,
  });
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id) return null;

  return {
    user_id: row.user_id,
    role: row.role,
    store_id: row.store_id,
  };
}

async function invokeStaffPinLoginFunction(
  functionName: string,
  storeId: string | undefined,
  pin: string,
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({
      ...(storeId ? { store_id: storeId } : {}),
      pin: pin.trim(),
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token_hash?: string;
    role?: StaffRole;
    user_id?: string;
  };

  if (res.status === 404) {
    return { kind: "missing" as const };
  }

  if (!res.ok) {
    const message = payload.error || "Código incorrecto";
    if (isStaleStaffPinServerError(message, pin)) {
      return { kind: "stale" as const, message };
    }
    throw new Error(message);
  }

  if (payload.error || !payload.token_hash) {
    throw new Error(payload.error || "Resposta inválida do servidor");
  }

  return { kind: "ok" as const, payload };
}

async function completePinSession(payload: { token_hash: string; role?: StaffRole; user_id?: string }) {
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: payload.token_hash,
    type: "magiclink",
  });

  if (otpError) {
    throw new Error(otpError.message || "Não foi possível iniciar sessão");
  }

  markStaffSession();

  return {
    role: (payload.role as StaffRole | undefined) ?? null,
    userId: payload.user_id ?? null,
  };
}

async function tryLoginFunctions(
  storeIds: string[],
  pin: string,
): Promise<{ token_hash: string; role?: StaffRole; user_id?: string } | null> {
  const trimmedPin = pin.trim();
  const storeAttempts = storeIds.length ? storeIds : [undefined];
  let sawStaleServer = false;
  let primaryMissing = false;

  for (const functionName of [PRIMARY_LOGIN_FUNCTION, LEGACY_LOGIN_FUNCTION]) {
    if (functionName === LEGACY_LOGIN_FUNCTION && trimmedPin.includes("#")) {
      continue;
    }

    for (const storeId of storeAttempts) {
      try {
        const result = await invokeStaffPinLoginFunction(functionName, storeId, trimmedPin);
        if (result.kind === "missing") {
          if (functionName === PRIMARY_LOGIN_FUNCTION) primaryMissing = true;
          break;
        }
        if (result.kind === "stale") {
          sawStaleServer = true;
          break;
        }
        return result.payload;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isWrongPinMessage(msg)) throw e;
        if (isEdgeFunctionUnavailable(msg)) throw e;
      }
    }
  }

  if (primaryMissing || sawStaleServer) {
    return null;
  }

  return null;
}

/** Inicia sessão com código — usa servidor novo e ignora o antigo para códigos com #. */
export async function loginWithStaffPin(storeId: string | null, pin: string) {
  const trimmedPin = pin.trim();

  if (!PIN_PATTERN.test(trimmedPin)) {
    throw new Error("Código inválido — use 6–10 caracteres com # e números");
  }

  const verified = await lookupStaffByPin(trimmedPin);
  const candidates = await listCandidateStoreIds(verified?.store_id ?? storeId);

  if (verified?.store_id) {
    candidates.unshift(verified.store_id);
  }

  const uniqueStores = [...new Set(candidates)];

  try {
    const payload = await tryLoginFunctions(uniqueStores, trimmedPin);
    if (payload) {
      return completePinSession(payload);
    }
  } catch (e) {
    if (!(e instanceof Error) || !isWrongPinMessage(e.message)) {
      throw e;
    }
    if (!verified) throw e;
  }

  if (verified) {
    throw new StaffPinLoginHintError(verified.email);
  }

  if (!uniqueStores.length) {
    throw new Error("No se encontró el restaurante. Abra el menú principal y vuelva a intentar.");
  }

  throw new Error("Código incorrecto");
}

export async function verifyStaffPinOnly(storeId: string | null, pin: string) {
  const verified =
    (await lookupStaffByPin(pin.trim())) ??
    (await verifyPinOnClient(pin.trim(), storeId?.trim() || undefined)) ??
    (await (async () => {
      for (const sid of await listCandidateStoreIds(storeId)) {
        const hit = await verifyPinOnClient(pin.trim(), sid);
        if (hit) return hit;
      }
      return null;
    })());

  if (!verified) {
    throw new Error("Código incorrecto");
  }
  return verified;
}
