import {
  DollarSign,
  ShoppingBag,
  CalendarDays,
  Users,
  AlertTriangle,
  TrendingUp,
  Store,
} from "lucide-react";
import { PremiumShell } from "@/components/premium/PremiumShell";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";

const topRestaurants = [
  { name: "Kebab Turco", revenue: "€ 28.450,80", orders: "2.104", ticket: "€ 21,50" },
  { name: "Tony Pizza", revenue: "€ 18.230,40", orders: "1.560", ticket: "€ 19,80" },
  { name: "Burger House", revenue: "€ 15.890,20", orders: "1.356", ticket: "€ 18,90" },
  { name: "Sushi Go", revenue: "€ 12.450,00", orders: "1.025", ticket: "€ 17,60" },
  { name: "Pastelanche", revenue: "€ 9.850,00", orders: "842", ticket: "€ 16,30" },
];

const alerts = [
  { title: "Tony Pizza sem pedidos há 7 dias", level: "Médio", color: "orange" },
  { title: "Burger House sem Stripe configurado", level: "Crítico", color: "red" },
  { title: "Sushi Go impressora offline", level: "Médio", color: "orange" },
  { title: "Pastelanche atualização pendente", level: "Baixo", color: "blue" },
];

export default function AdminDashboard() {
  return (
    <PremiumShell
      title="Dashboard"
      subtitle="Visão geral completa da sua rede de restaurantes"
      activeHref="/admin"
      mode="dark"
    >
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <PremiumMetricCard
            title="Restaurantes ativos"
            value="47"
            subtitle="este mês"
            trend="+3"
            icon={Store}
            color="brand"
          />
          <PremiumMetricCard
            title="Faturamento da rede"
            value="€ 128.450,80"
            subtitle="vs mês passado"
            trend="+18,5%"
            icon={DollarSign}
            color="brand"
          />
          <PremiumMetricCard
            title="Pedidos na rede"
            value="18.294"
            subtitle="vs mês passado"
            trend="+15,3%"
            icon={CalendarDays}
            color="brand"
          />
          <PremiumMetricCard
            title="Clientes na rede"
            value="12.856"
            subtitle="vs mês passado"
            trend="+12,1%"
            icon={Users}
            color="brand"
          />
          <PremiumMetricCard
            title="Alertas críticos"
            value="2"
            subtitle="Ver detalhes"
            trendDirection="down"
            icon={AlertTriangle}
            color="red"
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Faturamento da rede</h2>
                <p className="text-sm text-zinc-500">Últimos 12 meses</p>
              </div>
              <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300">
                Todos os restaurantes
              </button>
            </div>

            <div className="relative h-[270px] overflow-hidden rounded-xl bg-gradient-to-b from-[#D62300]/10 to-transparent">
              <svg viewBox="0 0 800 260" className="h-full w-full">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#D62300" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#D62300" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[40, 90, 140, 190, 240].map((y) => (
                  <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
                ))}

                <path
                  d="M20 220 C90 190 120 170 170 178 C240 185 260 120 330 115 C410 108 430 80 500 75 C590 66 610 90 690 55 C730 35 760 38 790 22 L790 260 L20 260 Z"
                  fill="url(#revenueGradient)"
                />

                <path
                  d="M20 220 C90 190 120 170 170 178 C240 185 260 120 330 115 C410 108 430 80 500 75 C590 66 610 90 690 55 C730 35 760 38 790 22"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {[20, 170, 330, 500, 690, 790].map((x, i) => (
                  <circle key={x} cx={x} cy={[220, 178, 115, 75, 55, 22][i]} r="5" fill="#EF4444" />
                ))}
              </svg>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">Top restaurantes</h2>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">
                Faturamento
              </button>
            </div>

            <div className="space-y-4">
              {topRestaurants.map((item, index) => (
                <div key={item.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
                  <span className="text-sm font-bold text-zinc-500">{index + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.orders} pedidos · ticket {item.ticket}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-[#8B0F1A] to-[#D62300]"
                        style={{ width: `${95 - index * 12}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-bold">{item.revenue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">Alertas inteligentes</h2>
              <button className="text-sm font-bold text-[#EF4444]">Ver todos</button>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#D62300]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{alert.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">Ação recomendada disponível</p>
                    </div>
                    <span className="rounded-lg bg-[#D62300]/10 px-2 py-1 text-[10px] font-bold text-[#EF4444]">
                      {alert.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <MiniStat label="Pedidos hoje" value="1.284" icon={ShoppingBag} />
          <MiniStat label="Receita hoje" value="€ 8.450,20" icon={DollarSign} />
          <MiniStat label="Clientes hoje" value="856" icon={Users} />
          <MiniStat label="Novos restaurantes" value="2" icon={Store} />
          <MiniStat label="Chamados suporte" value="7" icon={AlertTriangle} danger />
          <MiniStat label="MRR previsto" value="€ 5.480,00" icon={TrendingUp} />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <Panel title="Vendas por canal">
            <DonutLegend items={["Salão 40%", "Delivery 25%", "QR Mesa 20%", "Take Away 10%", "App 5%"]} />
          </Panel>

          <Panel title="Métodos de pagamento">
            <DonutLegend items={["Cartão 45%", "Dinheiro 30%", "Online 15%", "Bizum 5%", "Outros 5%"]} />
          </Panel>

          <Panel title="Status da rede">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Status label="Online" value="44" color="green" />
              <Status label="Atualizações" value="5" color="blue" />
              <Status label="Offline" value="3" color="red" />
              <Status label="APK pendente" value="3" color="purple" />
              <Status label="Problemas" value="2" color="orange" />
              <Status label="Stripe pendente" value="4" color="red" />
            </div>
          </Panel>

          <Panel title="Funil de implantação">
            <div className="space-y-3">
              {[
                ["Leads", "142", "bg-red-500", "w-full"],
                ["Teste grátis", "58", "bg-orange-500", "w-4/5"],
                ["Implantação", "32", "bg-green-500", "w-3/5"],
                ["Ativos", "47", "bg-blue-500", "w-2/5"],
                ["Cancelados", "12", "bg-zinc-500", "w-1/4"],
              ].map(([label, value, color, width]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`h-4 rounded ${color} ${width}`} />
                  <span className="w-24 text-xs text-zinc-400">{label}</span>
                  <span className="text-sm font-bold">{value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </PremiumShell>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            danger ? "bg-red-500/15 text-red-400" : "bg-[#D62300]/15 text-[#EF4444]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-lg font-black">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <h3 className="mb-5 text-lg font-black">{title}</h3>
      {children}
    </div>
  );
}

function DonutLegend({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-5">
      <div className="h-24 w-24 rounded-full bg-[conic-gradient(#22C55E_0_35%,#2563EB_35%_60%,#F97316_60%_78%,#7C3AED_78%_90%,#D62300_90%_100%)]" />
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm text-zinc-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function Status({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "red" | "purple" | "orange";
}) {
  const colors = {
    green: "text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    red: "text-red-400 bg-red-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="text-zinc-400">{label}</span>
      <span className={`rounded-lg px-2 py-1 text-xs font-black ${colors[color]}`}>{value}</span>
    </div>
  );
}
