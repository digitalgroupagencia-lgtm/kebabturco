import type { CustomerProfile, SavedDeliveryAddress } from "@/lib/customerSession";
import { supabase } from "@/integrations/supabase/client";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";

function deliveryFromJson(raw: unknown): SavedDeliveryAddress {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    street: String(o.street ?? ""),
    number: String(o.number ?? ""),
    floor: String(o.floor ?? ""),
    door: String(o.door ?? ""),
    block: String(o.block ?? ""),
    postalCode: String(o.postalCode ?? ""),
    city: String(o.city ?? ""),
    notes: String(o.notes ?? ""),
  };
}

export async function fetchCustomerProfileFromCloud(
  storeId: string,
  dialCode: string,
  localPhone: string,
): Promise<CustomerProfile | null> {
  if (!storeId || !isValidCustomerPhone(dialCode, localPhone)) return null;
  const phone = formatFullPhone(dialCode, localPhone);
  try {
    const { data, error } = await (supabase.rpc as any)("get_customer_saved_profile", {
      _store_id: storeId,
      _phone: phone,
    });
    if (error || !data) return null;
    const row = data as { name?: string | null; delivery?: unknown };
    const delivery = deliveryFromJson(row.delivery);
    const name = row.name?.trim() || "";
    if (!name && !delivery.street.trim() && !delivery.city.trim()) return null;
    return {
      name,
      phoneDialCode: dialCode,
      phoneLocal: localPhone.trim(),
      delivery,
    };
  } catch {
    return null;
  }
}

export async function saveCustomerProfileToCloud(
  storeId: string,
  profile: CustomerProfile,
): Promise<void> {
  if (!storeId || !isValidCustomerPhone(profile.phoneDialCode, profile.phoneLocal)) return;
  const phone = formatFullPhone(profile.phoneDialCode, profile.phoneLocal);
  try {
    await (supabase.rpc as any)("upsert_customer_saved_profile", {
      _store_id: storeId,
      _phone: phone,
      _name: profile.name.trim() || null,
      _delivery: profile.delivery,
    });
  } catch {
    /* nuvem opcional — local continua a funcionar */
  }
}

export function mergeCustomerProfiles(local: CustomerProfile, remote: CustomerProfile): CustomerProfile {
  const pick = (a: string, b: string) => (a.trim() ? a : b);
  const d = local.delivery;
  const r = remote.delivery;
  return {
    name: pick(local.name, remote.name),
    phoneDialCode: pick(local.phoneDialCode, remote.phoneDialCode) || "+34",
    phoneLocal: pick(local.phoneLocal, remote.phoneLocal),
    delivery: {
      street: pick(d.street, r.street),
      number: pick(d.number, r.number),
      floor: pick(d.floor, r.floor),
      door: pick(d.door, r.door),
      block: pick(d.block, r.block),
      postalCode: pick(d.postalCode, r.postalCode),
      city: pick(d.city, r.city),
      notes: pick(d.notes, r.notes),
    },
  };
}

export function isProfileMostlyEmpty(profile: CustomerProfile): boolean {
  const d = profile.delivery;
  return !(
    profile.name.trim() ||
    profile.phoneLocal.trim() ||
    d.street.trim() ||
    d.city.trim()
  );
}
