import { supabase } from "@/integrations/supabase/client";
import { fetchMyStaffProfile, isStaffProfileIncomplete, saveMyStaffProfile } from "@/services/staffProfile";

export type SellerSetupStatus = {
  profileComplete: boolean;
  hasPin: boolean;
  ready: boolean;
};

async function saveSellerPinViaEdge(input: {
  fullName: string;
  birthDate?: string | null;
  pin: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("seller-complete-onboarding", {
    body: {
      full_name: input.fullName.trim(),
      birth_date: input.birthDate ?? null,
      pin: input.pin.trim(),
    },
  });
  if (error) throw error;
  if (data && typeof data === "object") {
    const payload = data as { success?: boolean; error?: string };
    if (payload.error) throw new Error(payload.error);
    if (payload.success) return;
  }
  throw new Error("Não foi possível guardar o perfil do vendedor");
}

export async function hasMyStaffAccessPin(userId: string): Promise<boolean> {
  const pinRes = await supabase.rpc("has_my_staff_access_pin");
  if (!pinRes.error) return pinRes.data === true;
  const { data: pinRow } = await supabase
    .from("staff_access_pins")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(pinRow?.id);
}

export async function fetchSellerSetupStatus(userId: string): Promise<SellerSetupStatus> {
  const [profile, hasPin] = await Promise.all([
    fetchMyStaffProfile(userId),
    hasMyStaffAccessPin(userId),
  ]);

  const profileComplete = !isStaffProfileIncomplete(profile);
  return {
    profileComplete,
    hasPin,
    ready: profileComplete && hasPin,
  };
}

export async function saveSellerOnboarding(input: {
  fullName: string;
  birthDate?: string | null;
  pin: string;
}): Promise<void> {
  try {
    await saveSellerPinViaEdge(input);
    return;
  } catch (edgeErr) {
    const edgeMsg = edgeErr instanceof Error ? edgeErr.message : String(edgeErr);
    const edgeUnavailable =
      edgeMsg.includes("Failed to send") ||
      edgeMsg.includes("FunctionsFetchError") ||
      edgeMsg.includes("not found") ||
      edgeMsg.toLowerCase().includes("404");

    if (!edgeUnavailable) throw edgeErr;
  }

  await saveMyStaffProfile({
    full_name: input.fullName.trim(),
    birth_date: input.birthDate ?? null,
    avatar_url: null,
  });

  await saveMyStaffAccessPin(input.pin);
}

export async function saveMyStaffAccessPin(pin: string): Promise<void> {
  const { error } = await supabase.rpc("upsert_my_staff_access_pin", { _pin: pin.trim() });
  if (error) throw error;
}

export async function verifyMyStaffAccessPin(storeId: string, pin: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_staff_access_pin", {
    _store_id: storeId,
    _pin: pin.trim(),
  });
  if (error) throw error;
  return (data ?? []).some((row: { user_id: string }) => row.user_id === userId);
}

const PANEL_ONBOARDING_KEY = "kebab-panel-onboarding-ready";

export function isPanelOnboardingCached(userId: string): boolean {
  try {
    return sessionStorage.getItem(`${PANEL_ONBOARDING_KEY}:${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markPanelOnboardingCached(userId: string): void {
  try {
    sessionStorage.setItem(`${PANEL_ONBOARDING_KEY}:${userId}`, "1");
  } catch {
    /* ignore */
  }
}
