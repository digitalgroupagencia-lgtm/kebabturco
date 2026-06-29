import { supabase } from "@/integrations/supabase/client";
import { hasStaffGoogleLoginIntent } from "@/lib/staffGoogleLoginIntent";
import type { StaffRole } from "@/lib/staffPermissions";

export type StaffGoogleLoginStatus = "active" | "pending" | "rejected";

export type StaffGooglePendingMember = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export function userSignedInWithGoogle(user: {
  identities?: { provider?: string }[];
  app_metadata?: { provider?: string; providers?: string[] };
  user_metadata?: { provider?: string; iss?: string };
} | null): boolean {
  if (!user) return false;
  if (hasStaffGoogleLoginIntent()) return true;
  if (user.app_metadata?.provider === "google") return true;
  if ((user.app_metadata?.providers ?? []).includes("google")) return true;
  if (user.user_metadata?.provider === "google") return true;
  if (typeof user.user_metadata?.iss === "string" && user.user_metadata.iss.includes("google")) {
    return true;
  }
  return (user.identities ?? []).some((identity) => {
    const provider = identity.provider ?? "";
    return provider === "google" || provider === "oauth" || provider === "oidc";
  });
}

export async function userHasRoleAtStore(userId: string, storeId: string): Promise<boolean> {
  const { data: master, error: masterError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin_master")
    .maybeSingle();
  if (!masterError && master) return true;

  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function userHasAnyStaffRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}

export async function registerStaffGoogleLogin(storeId: string): Promise<{
  status: StaffGoogleLoginStatus;
  role?: string;
}> {
  const { data, error } = await supabase.rpc("register_staff_google_login", {
    _store_id: storeId,
  });
  if (error) throw new Error(error.message || "Não foi possível registar o pedido de acesso");
  const row = data as { status?: StaffGoogleLoginStatus; role?: string } | null;
  return {
    status: row?.status ?? "pending",
    role: row?.role,
  };
}

const REGISTER_RETRY_DELAYS_MS = [0, 600, 1500];

export async function registerStaffGoogleLoginWithRetry(storeId: string) {
  let lastError: Error | null = null;
  for (const delay of REGISTER_RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
    try {
      return await registerStaffGoogleLogin(storeId);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error("Não foi possível registar o pedido de acesso");
}

export async function listStaffGooglePending(storeId: string): Promise<StaffGooglePendingMember[]> {
  const { data, error } = await supabase.rpc("list_staff_google_pending", {
    _store_id: storeId,
  });
  if (error) throw new Error(error.message || "Não foi possível carregar pedidos Google");
  return (data ?? []) as StaffGooglePendingMember[];
}

export async function approveStaffGooglePending(params: {
  pendingId: string;
  role: StaffRole;
  fullName?: string | null;
  preferredLanguage?: string;
}) {
  const { data, error } = await supabase.rpc("approve_staff_google_pending", {
    _pending_id: params.pendingId,
    _role: params.role,
    _full_name: params.fullName?.trim() || null,
    _preferred_language: params.preferredLanguage || "es",
  });
  if (error) throw new Error(error.message || "Não foi possível aprovar o pedido");
  return data as { success: boolean; user_id?: string; role?: string };
}

export async function rejectStaffGooglePending(pendingId: string) {
  const { data, error } = await supabase.rpc("reject_staff_google_pending", {
    _pending_id: pendingId,
  });
  if (error) throw new Error(error.message || "Não foi possível excluir o pedido");
  return data as { success: boolean };
}
