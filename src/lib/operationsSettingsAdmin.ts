import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OperationsSettingsRow = Tables<"operations_settings">;

/** Carrega definições operacionais; cria linha por defeito se a loja ainda não tiver. */
export async function loadOperationsSettingsForStore(
  storeId: string,
): Promise<OperationsSettingsRow | null> {
  const { data, error } = await supabase
    .from("operations_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    console.error("[operations_settings] load failed", error);
    return null;
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("operations_settings")
    .insert({ store_id: storeId })
    .select("*")
    .maybeSingle();

  if (insertError) {
    console.warn("[operations_settings] insert failed — using UI without row", insertError);
    return null;
  }

  return inserted;
}
