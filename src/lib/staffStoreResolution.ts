import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STORE_ID, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { fetchActiveStoresForTenant } from "@/lib/fetchActiveStores";
import { isDefaultKebabContextHost, normalizeHostname } from "@/lib/platformHosts";
import type { StoreOption } from "@/lib/storeResolution";

/** Slug do restaurante em ?tenant=kebab-turco (staff/admin/panel). */
export function readTenantSlugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const slug = new URLSearchParams(window.location.search).get("tenant")?.trim();
  return slug || null;
}

async function tenantIdFromSlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

async function defaultKebabTenantId(): Promise<string | null> {
  return tenantIdFromSlug(DEFAULT_TENANT_SLUG);
}

async function tenantIdFromHost(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const host = normalizeHostname(window.location.hostname);
  if (!host) return null;

  const { data: rows } = await supabase
    .from("tenants")
    .select("id, custom_domain, slug")
    .eq("is_active", true);

  const byDomain = (rows ?? []).find(
    (t) => t.custom_domain && normalizeHostname(t.custom_domain) === host,
  );
  if (byDomain?.id) return byDomain.id;

  if (isDefaultKebabContextHost(host)) return defaultKebabTenantId();
  return null;
}

/**
 * Tenant activo para painel/admin.
 * Admin master: ignora tenant_id do perfil; usa URL, domínio ou Kebab Turco.
 */
export async function resolveStaffTenantId(
  selectedTenantId: string | null | undefined,
  roleTenantId: string | null | undefined,
  isAdminMaster: boolean,
): Promise<string | null> {
  const fromQuery = readTenantSlugFromUrl();
  if (fromQuery) {
    const id = await tenantIdFromSlug(fromQuery);
    if (id) return id;
  }

  if (selectedTenantId) return selectedTenantId;

  if (!isAdminMaster && roleTenantId) return roleTenantId;

  const fromHost = await tenantIdFromHost();
  if (fromHost) return fromHost;

  if (isAdminMaster) return defaultKebabTenantId();

  return roleTenantId ?? defaultKebabTenantId();
}

/** Todas as lojas activas (admin master vê o projecto inteiro). */
export async function fetchAllActiveStoresPlatform(): Promise<StoreOption[]> {
  const select = "id, name, address, image_url, short_description";
  const { data, error } = await supabase
    .from("stores")
    .select(select)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!error && data?.length) {
    return data as StoreOption[];
  }

  const { data: tenants } = await supabase.from("tenants").select("id").eq("is_active", true);
  const merged: StoreOption[] = [];
  for (const t of tenants ?? []) {
    const stores = await fetchActiveStoresForTenant(t.id);
    merged.push(...stores);
  }
  const seen = new Set<string>();
  return merged.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export async function fetchStoresForStaffContext(
  tenantId: string | null,
  isAdminMaster: boolean,
): Promise<StoreOption[]> {
  let stores: StoreOption[] = [];
  if (tenantId) {
    stores = await fetchActiveStoresForTenant(tenantId);
  }
  if (!stores.length && isAdminMaster) {
    stores = await fetchAllActiveStoresPlatform();
  }
  return stores;
}

export function pickStaffStoreId(
  stores: { id: string }[],
  tenantId: string | null,
  lockedStoreId: string | null | undefined,
  panelStorageKey: (tenantId: string) => string,
  adminStorageKey: (tenantId: string) => string,
): string | null {
  if (!stores.length) return null;

  const pick = (id: string | null | undefined) =>
    id && stores.some((s) => s.id === id) ? id : null;

  const panelSaved =
    tenantId && typeof window !== "undefined"
      ? window.localStorage.getItem(panelStorageKey(tenantId))
      : null;
  const adminSaved =
    tenantId && typeof window !== "undefined"
      ? window.localStorage.getItem(adminStorageKey(tenantId))
      : null;

  return (
    pick(panelSaved) ??
    pick(adminSaved) ??
    pick(lockedStoreId) ??
    pick(DEFAULT_STORE_ID) ??
    stores[0]?.id ??
    null
  );
}
