import { supabase } from "@/integrations/supabase/client";
import { nav } from "@/lib/navPaths";
import type { StaffRole } from "@/lib/staffPermissions";

export const STAFF_SESSION_FLAG = "kebabturco.staffSession";

export function markStaffSession() {
  try {
    localStorage.setItem(STAFF_SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function clearStaffSessionFlag() {
  try {
    localStorage.removeItem(STAFF_SESSION_FLAG);
  } catch {
    /* ignore */
  }
}

export function isStaffSessionFlagSet(): boolean {
  try {
    return localStorage.getItem(STAFF_SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Destino após código de equipe — separado do fluxo do cliente. */
export function resolveStaffLoginDestination(role: StaffRole | string | null | undefined): string {
  switch (role) {
    case "delivery":
      return nav.delivery();
    case "kitchen":
      return nav.panel("live");
    case "cashier":
      return nav.panel("cashier");
    case "admin_master":
      return nav.admin();
    case "seller":
      return nav.seller();
    case "restaurant_admin":
    case "manager":
      return nav.panel("dashboard");
    case "operator":
    case "attendant":
      return nav.panel("live");
    default:
      return nav.panel("live");
  }
}

export async function loginWithStaffPin(storeId: string, pin: string) {
  const { data, error } = await supabase.functions.invoke("staff-pin-login", {
    body: { store_id: storeId, pin },
  });

  if (error) {
    throw new Error(error.message || "Não foi possível validar o código");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  const tokenHash = data?.token_hash as string | undefined;
  if (!tokenHash) {
    throw new Error("Resposta inválida do servidor");
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (otpError) {
    throw new Error(otpError.message || "Não foi possível iniciar sessão");
  }

  markStaffSession();

  return {
    role: (data?.role as StaffRole | undefined) ?? null,
    userId: (data?.user_id as string | undefined) ?? null,
  };
}
