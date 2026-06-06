import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CreditCard,
  DollarSign,
  Loader2,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nav } from "@/lib/navPaths";
import PlatformPageShell from "@/components/admin/premium/PlatformPageShell";
import MetricTile from "@/components/admin/premium/MetricTile";
import ActivityFeed, { type ActivityItem } from "@/components/admin/premium/ActivityFeed";
import StatusPill from "@/components/admin/premium/StatusPill";
import { Button } from "@/components/ui/button";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

type StoreRow = {
  id: string;
  tenant_id: string;
};

type OrderRow = {
  id: string;
  order_number: number | null;
  store_id: string;
  total: number | null;
  status: string;
  created_at: string;
};

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-PT", { month: "short" }).format(date);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "ontem" : `há ${days}d`;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-functional-overview"],
    queryFn: async () => {
      const [tenantsRes, storesRes, ordersRes] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, slug, is_active, created_at, is_template")
          .eq("is_template", false)
          .order("created_at", { ascending: false }),
        supabase.from("stores").select("id, tenant_id").eq("is_active", true),
        supabase
          .from("orders")
          .select("id, order_number, store_id, total, status, created_at")
          .gte(
            "created_at",
            new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString(),
          )
          .order("created_at", { ascending: false }),
      ]);

      if (tenantsRes.error) throw tenantsRes.error;
      if (storesRes.error) throw storesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      return {
        tenants: (tenantsRes.data ?? []) as TenantRow[],
        stores: (storesRes.data ?? []) as StoreRow[],
        orders: (ordersRes.data ?? []) as OrderRow[],
      };
    },
    refetchInterval: 45000,
  });

  const derived = useMemo(() => {
    const tenants = data?.tenants ?? [];
    const stores = data?.stores ?? [];
    const orders = data?.orders ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const storeToTenant = new Map(stores.map((s) => [s.id, s.tenant_id]));

    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const todayOrders = validOrders.filter((o) => new Date(o.created_at) >= dayStart);
    const monthOrders = validOrders.filter((o) => new Date(o.created_at) >= monthStart);

    const revenueToday = todayOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const revenueMonth = monthOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const avgTicket = todayOrders.length > 0 ? revenueToday / todayOrders.length : 0;

    const topByTenant = new Map<string, { name: string; revenue: number; orders: number }>();
    for (const order of monthOrders) {
      const tenantId = storeToTenant.get(order.store_id);
      if (!tenantId) continue;
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) continue;
      if (!topByTenant.has(tenantId)) {
        topByTenant.set(tenantId, { name: tenant.name, revenue: 0, orders: 0 });
      }
      const row = topByTenant.get(tenantId)!;
      row.revenue += Number(order.total ?? 0);
      row.orders += 1;
    }

    const topTenants = [...topByTenant.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const monthlyMap = new Map<string, number>();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const order of validOrders) {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(order.total ?? 0));
      }
    }
    const monthlySeries = [...monthlyMap.entries()].map(([k, v]) => {
      const [year, month] = k.split("-").map(Number);
      return { monthLabel: monthLabel(new Date(year, month, 1)), revenue: v };
    });

    const recentActivity: ActivityItem[] = (orders.slice(0, 8) ?? []).map((o) => {
      const tenantId = storeToTenant.get(o.store_id);
      const tenantName = tenants.find((t) => t.id === tenantId)?.name ?? "Restaurante";
      return {
        id: `order-${o.id}`,
        title: `Pedido #${o.order_number ?? "—"} · ${tenantName}`,
        detail: fmtMoney(Number(o.total ?? 0)),
        time: relativeTime(o.created_at),
        icon: ShoppingBag,
        tone: o.status === "cancelled" ? "warning" : "success",
      };
    });

    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const lateCount = orders.filter((o) => o.status === "ready").length;

    return {
      activeTenants: tenants.filter((t) => t.is_active).length,
      totalTenants: tenants.length,
      ordersToday: todayOrders.length,
      revenueToday,
      revenueMonth,
      avgTicket,
      pendingCount,
      lateCount,
      topTenants,
      monthlySeries,
      recentActivity,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PlatformPageShell width="full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <StatusPill label="Admin" tone="active" dot />
            <StatusPill label="Dados reais" tone="neutral" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard de administração
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão funcional da operação, financeira e saúde geral.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={nav.admin("monitoring")}>Monitoramento</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={nav.admin("diagnostics")}>Estado do sistema</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={nav.panel("live")}>Operação ao vivo</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          icon={Building2}
          label="Restaurantes ativos"
          value={derived.activeTenants}
          sub={`${derived.totalTenants} no total`}
        />
        <MetricTile
          icon={DollarSign}
          label="Receita do mês"
          value={fmtMoney(derived.revenueMonth)}
          sub={`Hoje ${fmtMoney(derived.revenueToday)}`}
        />
        <MetricTile
          icon={ShoppingBag}
          label="Pedidos hoje"
          value={derived.ordersToday}
          sub={`Ticket médio ${fmtMoney(derived.avgTicket)}`}
        />
        <MetricTile
          icon={AlertCircle}
          label="Atenção operacional"
          value={derived.pendingCount + derived.lateCount}
          sub={`${derived.pendingCount} pendentes · ${derived.lateCount} prontos`}
          delta={derived.pendingCount + derived.lateCount > 0 ? "Requer atenção" : "Tudo sob controle"}
          deltaUp={!(derived.pendingCount + derived.lateCount > 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Receita dos últimos 12 meses</h3>
            <StatusPill label="Atualização automática" tone="active" dot />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {derived.monthlySeries.map((item) => (
              <div key={item.monthLabel} className="rounded-lg border border-border/60 bg-background/70 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">{item.monthLabel}</p>
                <p className="mt-1 text-xs font-bold text-foreground">{fmtMoney(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
        <ActivityFeed items={derived.recentActivity} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Top restaurantes</h3>
            <Link to={nav.admin("stores")} className="text-xs font-semibold text-primary hover:underline">
              Abrir lista
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {derived.topTenants.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sem dados suficientes para ranking.
              </p>
            )}
            {derived.topTenants.map((tenant, idx) => (
              <div key={`${tenant.name}-${idx}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.orders} pedidos no mês</p>
                </div>
                <p className="text-sm font-bold">{fmtMoney(tenant.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold">Ações rápidas</h3>
          <div className="mt-4 space-y-2">
            {[
              { label: "Configurar pagamentos", to: nav.admin("payments"), icon: CreditCard },
              { label: "Rever monitoramento", to: nav.admin("monitoring"), icon: TrendingUp },
              { label: "Validar operação ao vivo", to: nav.panel("live"), icon: ShoppingBag },
            ].map((entry) => (
              <Link
                key={entry.label}
                to={entry.to}
                className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <entry.icon className="h-4 w-4 text-primary" />
                  {entry.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PlatformPageShell>
  );
}
