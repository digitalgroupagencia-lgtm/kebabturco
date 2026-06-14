import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatEur } from "@/services/restaurantFinanceService";
import type { DailyFinancePoint } from "@/services/financeAnalyticsService";
import PremiumEmptyState from "@/components/admin/premium/PremiumEmptyState";
import { LineChart as LineIcon } from "lucide-react";

type Props = {
  data: DailyFinancePoint[];
  height?: number;
};

export default function PremiumDualLineChart({ data, height = 256 }: Props) {
  const hasActivity = data.some((d) => d.netCents > 0 || d.feesCents > 0);

  if (!hasActivity) {
    return (
      <PremiumEmptyState
        icon={LineIcon}
        title="Sem histórico ainda"
        description="A evolução diária aparece após os primeiros pagamentos."
      />
    );
  }

  const series = data.map((d) => ({
    ...d,
    netEur: d.netCents / 100,
    feesEur: d.feesCents / 100,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `€${v}`}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: number, name: string) => [
              `${formatEur(Math.round(v * 100))}€`,
              name === "netEur" ? "Líquido para si" : "Taxas",
            ]}
            labelFormatter={(l) => l}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => (value === "netEur" ? "Líquido" : "Taxas")}
          />
          <Line
            type="monotone"
            dataKey="netEur"
            stroke="hsl(var(--success))"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="feesEur"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
