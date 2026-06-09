import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import { CHART_TOKEN_HSL } from "@/lib/demoData";

type Slice = { name: string; value: number; amount?: number; token: keyof typeof CHART_TOKEN_HSL };

type Props = {
  title: string;
  subtitle?: string;
  data: Slice[];
  className?: string;
  /** Formatador opcional para o valor monetário na legenda. */
  formatAmount?: (n: number) => string;
};

export default function DonutChartCard({ title, subtitle, data, className, formatAmount }: Props) {
  return (
    <PremiumChartCard title={title} subtitle={subtitle} className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="60%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {data.map((s, i) => (
                  <Cell key={i} fill={CHART_TOKEN_HSL[s.token]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number, _n, p: any) => [`${v}%`, p?.payload?.name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2">
          {data.map((s) => (
            <li key={s.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: CHART_TOKEN_HSL[s.token] }}
              />
              <span className="flex-1 text-foreground font-medium truncate">{s.name}</span>
              <span className="text-muted-foreground tabular-nums">{s.value}%</span>
              {typeof s.amount === "number" && (
                <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
                  {formatAmount ? formatAmount(s.amount) : s.amount}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </PremiumChartCard>
  );
}