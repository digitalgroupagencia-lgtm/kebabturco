import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { isDefaultKebabContextHost, normalizeHostname } from "@/lib/platformHosts";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";

async function firstActiveStoreForTenant(tenantId: string): Promise<string | null> {
  const db = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const { data } = await db
    .from("stores_public")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.id) return data.id as string;

  const legacy = await supabase
    .from("stores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return legacy.data?.id ?? null;
}

/** Loja real para login da equipa — nunca usa ID de emergência do preview. */
export async function resolveStaffLoginStoreId(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const host = normalizeHostname(window.location.hostname);

  try {
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, slug, custom_domain")
      .eq("is_active", true);

    const byDomain =
      (tenants ?? []).find((t) => {
        if (!t.custom_domain) return false;
        return normalizeHostname(t.custom_domain) === host;
      }) ?? null;

    if (byDomain?.id) {
      const storeId = await firstActiveStoreForTenant(byDomain.id);
      if (storeId && !isEmergencyFallbackStoreId(storeId)) return storeId;
    }

    if (isDefaultKebabContextHost(host)) {
      const slugMatch = (tenants ?? []).find((t) => t.slug === DEFAULT_TENANT_SLUG);
      const tenantId = slugMatch?.id;
      if (tenantId) {
        const storeId = await firstActiveStoreForTenant(tenantId);
        if (storeId && !isEmergencyFallbackStoreId(storeId)) return storeId;
      }

      const { data: slugTenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", DEFAULT_TENANT_SLUG)
        .eq("is_active", true)
        .maybeSingle();

      if (slugTenant?.id) {
        const storeId = await firstActiveStoreForTenant(slugTenant.id);
        if (storeId && !isEmergencyFallbackStoreId(storeId)) return storeId;
      }
    }
  } catch (err) {
    console.error("[StaffLoginStore] resolve failed", err);
  }

  return null;
}
