import { supabase } from "@/integrations/supabase/client";
import { uploadImage, safeImageExt } from "@/lib/uploadImage";

export type StaffProfile = {
  user_id: string;
  full_name: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
};

export async function fetchMyStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, birth_date, avatar_url, preferred_language")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as StaffProfile;
}

export function isStaffProfileIncomplete(profile: StaffProfile | null): boolean {
  if (!profile) return true;
  const name = profile.full_name?.trim() ?? "";
  return name.length < 2;
}

export async function saveMyStaffProfile(input: {
  full_name: string;
  birth_date: string | null;
  avatar_url: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("upsert_my_staff_profile", {
    _full_name: input.full_name.trim() || null,
    _birth_date: input.birth_date || null,
    _avatar_url: input.avatar_url?.trim() || null,
  });
  if (error) throw error;
}

export async function uploadStaffAvatar(storeId: string, userId: string, file: File): Promise<string> {
  const ext = safeImageExt(file);
  const path = `${storeId}/staff/${userId}.${ext}`;
  return uploadImage("branding", path, file);
}
