import { supabase } from "@/integrations/supabase/client";
import { isPlatformAdminContext } from "@/lib/platformAdminContext";
import { buildTenantUrl, type TenantUrlConfig } from "@/lib/tenantUrls";

type RoleRow = { role: string; tenant_id: string | null };

/**
 * Destino após login — evita loop no domínio da plataforma (só admin_master fica).
 * Restaurantes devem usar o domínio próprio (ex.: kebabturco.net/panel).
 */
export async function resolvePostLoginDestination(userId: string): Promise<{
  type: "internal";
  path: string;
} | {
  type: "external";
  url: string;
} | {
  type: "denied";
  message: string;
}> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId);

  const rows = (roles ?? []) as RoleRow[];
  const onPlatformHost = isPlatformAdminContext();
  const isAdminMaster = rows.some((r) => r.role === "admin_master");
  const primaryRole = rows.find((r) => r.role === "admin_master")?.role ?? rows[0]?.role;

  if (onPlatformHost) {
    if (isAdminMaster) return { type: "internal", path: "/admin" };
    return {
      type: "denied",
      message: "Este endereço é só para gestão da plataforma SnapOrder. Entra pelo domínio do teu restaurante.",
    };
  }

  if (primaryRole === "admin_master") return { type: "internal", path: "/admin" };
  if (primaryRole === "seller") return { type: "internal", path: "/seller" };
  return { type: "internal", path: "/panel" };
}

/** Redirecciona utilizador de restaurante para o painel no domínio correcto do tenant. */
export async function resolveTenantPanelUrl(tenantId: string, route: "/panel" | "/seller" = "/panel"): Promise<string | null> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug, custom_domain, path_slug, master_domain, use_master_domain")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return null;
  return buildTenantUrl(tenant as TenantUrlConfig, route);
}
