import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Store, ShoppingBag, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock,
  Loader2, Trophy, Calendar
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend
} from "recharts";
import ResetDataDialog from "@/components/ResetDataDialog";
import SubscriptionDialog from "@/components/admin/SubscriptionDialog";

const fmtMoney = (v: number, cur = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(v || 0);

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const StatCard = ({ icon: Icon, label, value, sub, tone = "default" }: any) => {
  const tones: Record<string, string> = {
    default: "from-primary/10 to-primary/5 text-primary",
    success: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    danger: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
    info: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
  };
  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <p className="text-2xl font-black mt-1 truncate text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ${tones[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminDashboard = () => {
  const [resetTenant, setResetTenant] = useState<{ id: string; name: string } | null>(null);
  const [subTenant, setSubTenant] = useState<{ id: string; name: string } | null>(null);

  const { data: stats, isLoading: l1 } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
      if (error) throw error;
      return data?.[0];
    },
  });

  const { data: revenueSeries } = useQuery({
    queryKey: ["admin-revenue-series"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_revenue_series");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topTenants } = useQuery({
    queryKey: ["admin-top-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_tenants_by_revenue", { _limit: 5 });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: heatmap } = useQuery({
    queryKey: ["admin-heatmap"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_orders_heatmap");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ["admin-upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_upcoming_payments");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-with-billing"],
    queryFn: async () => {
      const { data: t } = await supabase.from("tenants").select("id, name, plan, is_active").order("name");
      const { data: subs } = await supabase.from("tenant_subscriptions").select("*");
      const subsMap = new Map((subs || []).map((s: any) => [s.tenant_id, s]));
      return (t || []).map((tenant: any) => ({ ...tenant, subscription: subsMap.get(tenant.id) }));
    },
  });

  if (l1) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // monta grade do heatmap
  const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let heatMax = 0;
  (heatmap || []).forEach((h: any) => {
    heatGrid[h.day_of_week][h.hour_of_day] = Number(h.order_count);
    if (Number(h.order_count) > heatMax) heatMax = Number(h.order_count);
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
      pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
      overdue: { label: "Atrasado", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
      trial: { label: "Trial", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30" },
      cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border" },
    };
    const it = map[status] || map.pending;
    return <Badge variant="outline" className={it.cls}>{it.label}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-foreground">Dashboard Admin Master</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de todos os projetos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="MRR" value={fmtMoney(Number(stats?.mrr || 0))} sub="Receita recorrente" tone="success" />
        <StatCard icon={Building2} label="Clientes" value={stats?.total_tenants || 0} sub={`${stats?.active_tenants || 0} ativos`} tone="info" />
        <StatCard icon={ShoppingBag} label="Pedidos hoje" value={stats?.orders_today || 0} sub={fmtMoney(Number(stats?.revenue_today || 0))} tone="default" />
        <StatCard icon={DollarSign} label="Receita do mês" value={fmtMoney(Number(stats?.revenue_month || 0))} sub="Soma de todas as lojas" tone="success" />
      </div>

      {/* Status financeiro */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={CheckCircle2} label="Pagos" value={stats?.paid_count || 0} tone="success" />
        <StatCard icon={Clock} label="Pendentes" value={stats?.pending_count || 0} tone="warning" />
        <StatCard icon={AlertCircle} label="Atrasados" value={stats?.overdue_count || 0} tone="danger" />
      </div>

      {/* Receita mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Receita mensal (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => [fmtMoney(Number(v)), "Receita"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top restaurantes do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTenants || []} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="tenant_name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: any) => fmtMoney(Number(v))}
                  />
                  <Bar dataKey="total_revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Próximos vencimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Próximos vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(upcoming || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma assinatura cadastrada</p>
              )}
              {(upcoming || []).map((u: any) => (
                <div key={u.tenant_id} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{u.tenant_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Vence em {new Date(u.next_due_date).toLocaleDateString("pt-BR")} · {u.days_until_due >= 0 ? `${u.days_until_due}d` : `${Math.abs(u.days_until_due)}d atrás`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold">{fmtMoney(Number(u.monthly_amount), u.currency)}</span>
                    {statusBadge(u.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapa de calor de pedidos (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex">
                <div className="w-10 shrink-0" />
                <div className="flex-1 grid grid-cols-24 gap-0.5 mb-1" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-[9px] text-center text-muted-foreground">{h}</div>
                  ))}
                </div>
              </div>
              {heatGrid.map((row, dow) => (
                <div key={dow} className="flex items-center mb-0.5">
                  <div className="w-10 shrink-0 text-[10px] font-semibold text-muted-foreground">{DAY_LABELS[dow]}</div>
                  <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
                    {row.map((c, h) => {
                      const intensity = heatMax === 0 ? 0 : c / heatMax;
                      return (
                        <div
                          key={h}
                          className="aspect-square rounded-[2px]"
                          style={{
                            background: c === 0
                              ? "hsl(var(--muted))"
                              : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                          }}
                          title={`${DAY_LABELS[dow]} ${h}h: ${c} pedidos`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de projetos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projetos & faturamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(tenants || []).map((t: any) => (
              <div key={t.id} className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{t.name}</span>
                    {t.subscription ? statusBadge(t.subscription.status) : <Badge variant="outline">Sem assinatura</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.subscription
                      ? `${fmtMoney(Number(t.subscription.monthly_amount), t.subscription.currency)} / mês · vence ${new Date(t.subscription.next_due_date).toLocaleDateString("pt-BR")}`
                      : "Configure o plano e o valor da mensalidade"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setSubTenant({ id: t.id, name: t.name })}>
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Cobrança
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setResetTenant({ id: t.id, name: t.name })}>
                    Zerar dados
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {resetTenant && (
        <ResetDataDialog
          open={!!resetTenant}
          onOpenChange={(v) => !v && setResetTenant(null)}
          tenantId={resetTenant.id}
          tenantName={resetTenant.name}
        />
      )}
      {subTenant && (
        <SubscriptionDialog
          open={!!subTenant}
          onOpenChange={(v) => !v && setSubTenant(null)}
          tenantId={subTenant.id}
          tenantName={subTenant.name}
        />
      )}
    </div>
  );
};

import { CreditCard } from "lucide-react";
export default AdminDashboard;