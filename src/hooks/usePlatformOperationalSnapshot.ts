import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformOperationalSnapshot, TenantOperationalRow } from "@/lib/operationalCentralMetrics";

export function usePlatformOperationalSnapshot() {
  return useQuery({
    queryKey: ["platform-operational-snapshot"],
    queryFn: async (): Promise<PlatformOperationalSnapshot> => {
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const [
        { data: tenants },
        { data: stores },
        { data: orders },
        { data: aiModules },
        { data: loyalty },
      ] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, slug, plan, is_active")
          .eq("is_template", false)
          .order("name"),
        supabase.from("stores").select("id, tenant_id"),
        supabase
          .from("orders")
          .select("store_id, total, status, created_at")
          .gte("created_at", since.toISOString())
          .neq("status", "cancelled"),
        supabase.from("tenant_ai_modules").select("tenant_id, is_enabled").eq("is_enabled", true),
        supabase.from("tenant_loyalty_programs").select("tenant_id, is_active").eq("is_active", true),
      ]);

      const storeToTenant = new Map<string, string>();
      (stores ?? []).forEach((s) => storeToTenant.set(s.id, s.tenant_id));

      const ordersByTenant = new Map<string, { count: number; revenue: number }>();
      (orders ?? []).forEach((o) => {
        const tid = storeToTenant.get(o.store_id);
        if (!tid) return;
        const cur = ordersByTenant.get(tid) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(o.total ?? 0);
        ordersByTenant.set(tid, cur);
      });

      const aiByTenant = new Map<string, number>();
      (aiModules ?? []).forEach((m) => {
        aiByTenant.set(m.tenant_id, (aiByTenant.get(m.tenant_id) ?? 0) + 1);
      });

      const loyaltySet = new Set((loyalty ?? []).map((l) => l.tenant_id));

      const rows: TenantOperationalRow[] = (tenants ?? []).map((t) => {
        const o = ordersByTenant.get(t.id) ?? { count: 0, revenue: 0 };
        return {
          tenantId: t.id,
          tenantName: t.name,
          slug: t.slug,
          plan: t.plan ?? "start",
          orders7d: o.count,
          revenue7d: o.revenue,
          aiModulesOn: aiByTenant.get(t.id) ?? 0,
          loyaltyActive: loyaltySet.has(t.id),
          featuresOn: (aiByTenant.get(t.id) ?? 0) + (loyaltySet.has(t.id) ? 1 : 0),
        };
      });

      return {
        tenants: rows,
        totalOrders7d: rows.reduce((s, r) => s + r.orders7d, 0),
        totalRevenue7d: rows.reduce((s, r) => s + r.revenue7d, 0),
        activeTenants: rows.filter((t) => (tenants ?? []).find((x) => x.id === t.tenantId)?.is_active !== false).length,
      };
    },
    staleTime: 60_000,
  });
}

export function useTenantOperationalSnapshot(tenantId: string | null | undefined) {
  const { data: platform, ...rest } = usePlatformOperationalSnapshot();
  const row = platform?.tenants.find((t) => t.tenantId === tenantId) ?? null;
  return { data: row, platform, ...rest };
}
