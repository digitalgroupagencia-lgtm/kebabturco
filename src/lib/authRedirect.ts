import { supabase } from "@/integrations/supabase/client";

type RoleRow = { role: string; tenant_id: string | null };

/** Destino após login — projecto único Kebab Turco. */
export async function resolvePostLoginDestination(userId: string): Promise<{
  type: "internal";
  path: string;
}> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId);

  const rows = (roles ?? []) as RoleRow[];
  const isAdminMaster = rows.some((r) => r.role === "admin_master");
  const primaryRole = rows.find((r) => r.role === "admin_master")?.role ?? rows[0]?.role;

  if (isAdminMaster || primaryRole === "admin_master" || primaryRole === "restaurant_admin") {
    return { type: "internal", path: "/admin" };
  }
  if (primaryRole === "seller") return { type: "internal", path: "/seller" };
  return { type: "internal", path: "/panel" };
}
