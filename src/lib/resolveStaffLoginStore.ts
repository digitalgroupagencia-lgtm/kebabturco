import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_SLUG, SINGLE_TENANT_MODE } from "@/lib/appMode";
import { isDefaultKebabContextHost, normalizeHostname } from "@/lib/platformHosts";
import { isEmergencyFallbackStoreId } from "@/lib/storeResolution";

const SELECTED_STORE_KEY = "totem.selectedStoreId";

export function persistStaffLoginStoreId(storeId: string) {
  if (!pickStoreId(storeId)) return;
  try {
    localStorage.setItem(SELECTED_STORE_KEY, storeId);
  } catch {
    /* ignore */
  }
}

function pickStoreId(id: string | null | undefined): string | null {
  if (!id || isEmergencyFallbackStoreId(id)) return null;
  return id;
}

export function readSavedStaffLoginStoreId(): string | null {
  try {
    return pickStoreId(localStorage.getItem(SELECTED_STORE_KEY));
  } catch {
    return null;
  }
}

function readSavedStoreId(): string | null {
  return readSavedStaffLoginStoreId();
}

async function firstPublicStoreId(tenantId?: string): Promise<string | null> {
  const db = supabase as unknown as {
    from: (table: string) => any;
  };

  let query = db
    .from("stores_public")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data, error } = await query;
  if (!error && data?.length) {
    return pickStoreId((data[0] as { id: string }).id);
  }

  let legacyQuery = supabase
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (tenantId) legacyQuery = legacyQuery.eq("tenant_id", tenantId);

  const legacy = await legacyQuery;
  return pickStoreId(legacy.data?.[0]?.id as string | undefined);
}

async function tenantIdForHost(host: string): Promise<string | null> {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, slug, custom_domain")
    .eq("is_active", true);

  if (error || !tenants?.length) return null;

  const byDomain = tenants.find((t) => {
    if (!t.custom_domain) return false;
    return normalizeHostname(t.custom_domain) === host;
  });
  if (byDomain?.id) return byDomain.id;

  const bySlug = tenants.find((t) => t.slug === DEFAULT_TENANT_SLUG);
  if (bySlug?.id) return bySlug.id;

  if (SINGLE_TENANT_MODE && tenants.length === 1) return tenants[0].id;

  return null;
}

/** Loja real para login da equipa — várias tentativas, nunca ID de preview. */
export async function resolveStaffLoginStoreId(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const saved = readSavedStoreId();
  if (saved) return saved;

  const host = normalizeHostname(window.location.hostname);

  try {
    const tenantId = await tenantIdForHost(host);
    if (tenantId) {
      const fromTenant = await firstPublicStoreId(tenantId);
      if (fromTenant) return fromTenant;
    }

    if (isDefaultKebabContextHost(host)) {
      const { data: slugTenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", DEFAULT_TENANT_SLUG)
        .eq("is_active", true)
        .maybeSingle();

      if (slugTenant?.id) {
        const fromSlug = await firstPublicStoreId(slugTenant.id);
        if (fromSlug) return fromSlug;
      }
    }

    if (SINGLE_TENANT_MODE || isDefaultKebabContextHost(host)) {
      const anyStore = await firstPublicStoreId();
      if (anyStore) return anyStore;
    }

    const { data: rpcStore, error: rpcError } = await (supabase.rpc as any)(
      "get_staff_login_store_id",
    );
    if (!rpcError && rpcStore) {
      const id = pickStoreId(typeof rpcStore === "string" ? rpcStore : String(rpcStore));
      if (id) return id;
    }
  } catch (err) {
    console.error("[StaffLoginStore] resolve failed", err);
  }

  return readSavedStaffLoginStoreId();
}

/** Obrigatório antes do login — nunca chama o servidor sem loja real. */
export async function ensureStaffLoginStoreId(hint?: string | null): Promise<string> {
  const fromHint = pickStoreId(hint ?? null);
  if (fromHint) {
    persistStaffLoginStoreId(fromHint);
    return fromHint;
  }

  const resolved = await resolveStaffLoginStoreId();
  if (resolved) {
    persistStaffLoginStoreId(resolved);
    return resolved;
  }

  const { data: rows } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  const direct = pickStoreId(rows?.[0]?.id as string | undefined);
  if (direct) {
    persistStaffLoginStoreId(direct);
    return direct;
  }

  throw new Error("No se encontró el restaurante");
}
