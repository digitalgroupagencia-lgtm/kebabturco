import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORE_ID = "b0000000-0000-0000-0000-000000000001";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["panel-dashboard-financial", STORE_ID],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("store_id", STORE_ID)
        .gte("created_at", startOfMonth.toISOString())
        .neq("status", "cancelled");
      if (error) throw error;

      const today = orders.filter((o) => new Date(o.created_at) >= startOfDay);
      const totalToday = today.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalMonth = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const ordersToday = today.length;
      const ordersMonth = orders.length;
      const avgTicket = ordersToday > 0 ? totalToday / ordersToday : 0;

      return { totalToday, totalMonth, ordersToday, ordersMonth, avgTicket };
    },
    refetchInterval: 60000,
  });

  const stats = [
    {
      title: "Pedidos Hoje",
      value: isLoading ? "—" : String(data?.ordersToday ?? 0),
      icon: ShoppingBag,
      color: "text-primary",
    },
    {
      title: "Faturamento Hoje",
      value: isLoading ? "—" : fmt(data?.totalToday ?? 0),
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Ticket Médio",
      value: isLoading ? "—" : fmt(data?.avgTicket ?? 0),
      icon: TrendingUp,
      color: "text-accent-foreground",
    },
    {
      title: "Faturamento Mês",
      value: isLoading ? "—" : fmt(data?.totalMonth ?? 0),
      icon: Calendar,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {data?.ordersMonth ?? 0} pedidos no mês
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao seu painel!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Acompanhe aqui o faturamento da sua loja em tempo real. Configure cardápio, totem e equipe pelo menu lateral.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
