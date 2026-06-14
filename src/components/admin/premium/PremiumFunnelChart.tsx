import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/services/restaurantFinanceService";
import type { MethodSlice } from "@/services/financeAnalyticsService";
import PremiumEmptyState from "@/components/admin/premium/PremiumEmptyState";
import { BarChart3 } from "lucide-react";

type Props = {
  data: MethodSlice[];
  height?: number;
};

export default function PremiumFunnelChart({ data, height = 220 }: Props) {
  if (data.length === 0) {
    return (
      <PremiumEmptyState
        icon={BarChart3}
        title="Sem dados por método"
        description="O ranking por volume aparece com os primeiros pagamentos."
      />
    );
  }

  const max = Math.max(...data.map((d) => d.volumeCents), 1);
  const chartData = data.map((d) => ({
    name: d.label,
    volumeEur: d.volumeCents / 100,
    count: d.count,
    color: d.color,
    widthPct: Math.max(12, Math.round((d.volumeCents / max) * 100)),
  }));

  return (
    <div className="space-y-3">
      {chartData.map((row) => (
        <div key={row.name} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">{row.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatEur(Math.round(row.volumeEur * 100))}€ · {row.count} ped.
            </span>
          </div>
          <div className="h-7 rounded-lg bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-lg transition-all"
              style={{
                width: `${row.widthPct}%`,
                backgroundColor: row.color,
                minWidth: row.volumeEur > 0 ? "2.5rem" : 0,
              }}
            />
          </div>
        </div>
      ))}
      <div className="sr-only">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip />
            <Bar dataKey="volumeEur" radius={6}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
