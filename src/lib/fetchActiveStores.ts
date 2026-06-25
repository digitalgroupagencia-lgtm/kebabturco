import { supabase } from "@/integrations/supabase/client";
import type { StoreOption } from "@/lib/storeResolution";

type StorePublicRow = StoreOption & {
  tenant_id?: string;
  sort_order?: number;
  created_at?: string;
};

/** Lista lojas activas, mesma lógica do site público (stores_public + fallback). */
export async function fetchActiveStoresForTenant(tenantId: string): Promise<StoreOption[]> {
  const select =
    "id, name, address, image_url, short_description, sort_order, created_at, tenant_id";
  const db = supabase as unknown as {
    from: (table: string) => any;
  };

  const { data, error } = await db
    .from("stores_public")
    .select(select)
    .eq("is_active", true)
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let rows = (!error && data?.length ? data : []) as StorePublicRow[];

  if (!rows.length) {
    const legacy = await supabase
      .from("stores")
      .select(select)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    rows = (legacy.data || []) as StorePublicRow[];
  }

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    image_url: s.image_url,
    short_description: s.short_description,
  }));
}
