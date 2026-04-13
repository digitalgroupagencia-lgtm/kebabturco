import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, DollarSign, TrendingUp, Users } from "lucide-react";

const stats = [
  { title: "Pedidos Hoje", value: "0", icon: ShoppingBag, color: "text-primary" },
  { title: "Faturamento", value: "R$ 0,00", icon: DollarSign, color: "text-success" },
  { title: "Ticket Médio", value: "R$ 0,00", icon: TrendingUp, color: "text-accent-foreground" },
  { title: "Clientes", value: "0", icon: Users, color: "text-primary" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
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
            Comece configurando seu cardápio no menu lateral. Depois configure as cores e logo do seu totem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
