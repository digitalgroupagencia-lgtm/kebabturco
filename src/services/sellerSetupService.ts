import { supabase } from "@/integrations/supabase/client";
import { fetchMyStaffProfile, isStaffProfileIncomplete, saveMyStaffProfile } from "@/services/staffProfile";

export type SellerSetupStatus = {
  profileComplete: boolean;
  hasPin: boolean;
  ready: boolean;
};

export async function fetchSellerSetupStatus(userId: string): Promise<SellerSetupStatus> {
  const [profile, pinRes] = await Promise.all([
    fetchMyStaffProfile(userId),
    supabase.rpc("has_my_staff_access_pin"),
  ]);

  let hasPin = pinRes.data === true;
  if (pinRes.error) {
    const { data: pinRow } = await supabase
      .from("staff_access_pins")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    hasPin = Boolean(pinRow?.id);
  }

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
  await saveMyStaffProfile({
    full_name: input.fullName.trim(),
    birth_date: input.birthDate ?? null,
    avatar_url: null,
  });

  const { error } = await supabase.rpc("upsert_my_staff_access_pin", { _pin: input.pin.trim() });
  if (error) throw error;
}
