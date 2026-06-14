import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatEur } from "@/services/restaurantFinanceService";
import type { MethodSlice } from "@/services/financeAnalyticsService";
import PremiumEmptyState from "@/components/admin/premium/PremiumEmptyState";
import { PieChart as PieIcon } from "lucide-react";

type Props = {
  data: MethodSlice[];
  height?: number;
};

export default function PremiumDonutChart({ data, height = 220 }: Props) {
  if (data.length === 0) {
    return (
      <PremiumEmptyState
        icon={PieIcon}
        title="Sem pagamentos ainda"
        description="Quando houver vendas online, vê aqui a divisão por método."
      />
    );
  }

  const chartData = data.map((d) => ({
    name: d.label,
    value: d.volumeCents / 100,
    count: d.count,
    percent: d.percent,
    color: d.color,
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-center">
      <div className="w-full lg:w-[52%]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number, _n, item) => [
                `${formatEur(Math.round(v * 100))}€ · ${(item.payload as { count: number }).count} pedido(s)`,
                item.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 w-full space-y-2.5 min-w-0">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
              aria-hidden
            />
            <span className="font-semibold text-foreground truncate flex-1">{d.label}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">{d.percent}%</span>
            <span className="font-bold tabular-nums shrink-0">{formatEur(d.volumeCents)}€</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
