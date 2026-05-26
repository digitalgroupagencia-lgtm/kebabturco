import { supabase } from "@/integrations/supabase/client";
import { isGeneralAdmin } from "@/lib/projectAccess";
import { nav } from "@/lib/navPaths.ts";
import { primaryAppAreaForRole, type StaffRole } from "@/lib/staffPermissions";

type RoleRow = { role: string; tenant_id: string | null };

/** Caminhos seguros para usar como `next` após login. */
function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next === "/auth" || next.startsWith("/auth/")) return null;
  return next;
}

/** Destino após login — respeita `next` quando válido; senão usa papel do utilizador. */
export async function resolvePostLoginDestination(
  userId: string,
  next?: string | null,
): Promise<{ type: "internal"; path: string }> {
  const safeNext = sanitizeNextPath(next);
  if (safeNext) {
    return { type: "internal", path: safeNext };
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId);

  const rows = (roles ?? []) as RoleRow[];
  const primaryRole =
    (rows.find((r) => r.role === "admin_master")?.role as StaffRole | undefined) ??
    (rows[0]?.role as StaffRole | undefined);

  if (isGeneralAdmin(primaryRole) || rows.some((r) => r.role === "admin_master")) {
    return { type: "internal", path: nav.admin() };
  }
  if (primaryRole === "seller") return { type: "internal", path: nav.seller() };

  const area = primaryAppAreaForRole(primaryRole);
  if (area === "delivery") return { type: "internal", path: nav.delivery() };

  return { type: "internal", path: nav.panel() };
}
