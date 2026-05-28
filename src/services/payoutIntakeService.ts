import { supabase } from "@/integrations/supabase/client";

export type StorePayoutIntake = {
  store_id: string;
  business_name: string;
  owner_full_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  tax_id: string | null;
  iban: string;
  business_address: string | null;
  notes: string | null;
  submitted_at: string;
  updated_at: string;
};

export type PayoutIntakeInput = {
  storeId: string;
  businessName: string;
  ownerFullName: string;
  iban: string;
  ownerEmail?: string;
  ownerPhone?: string;
  taxId?: string;
  businessAddress?: string;
  notes?: string;
};

export async function fetchStorePayoutIntake(storeId: string): Promise<StorePayoutIntake | null> {
  const { data, error } = await supabase.rpc("get_store_payout_intake" as never, {
    _store_id: storeId,
  } as never);
  if (error) {
    if (error.message.includes("Sem permissão") || error.code === "PGRST116") return null;
    throw error;
  }
  if (!data || typeof data !== "object") return null;
  return data as StorePayoutIntake;
}

export async function saveStorePayoutIntake(input: PayoutIntakeInput): Promise<void> {
  const { error } = await supabase.rpc("upsert_store_payout_intake" as never, {
    _store_id: input.storeId,
    _business_name: input.businessName,
    _owner_full_name: input.ownerFullName,
    _iban: input.iban,
    _owner_email: input.ownerEmail ?? null,
    _owner_phone: input.ownerPhone ?? null,
    _tax_id: input.taxId ?? null,
    _business_address: input.businessAddress ?? null,
    _notes: input.notes ?? null,
  } as never);
  if (error) throw error;
}

export function formatIbanDisplay(iban: string): string {
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}
