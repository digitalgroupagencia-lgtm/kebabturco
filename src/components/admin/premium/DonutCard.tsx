import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type DonutSlice = {
  id: string;
  label: string;
  value: number;
  amount?: string;
  color: string;
};

type Props = {
  title: string;
  subtitle?: string;
  data: DonutSlice[];
  className?: string;
  /** show inner total label */
  centerLabel?: string;
  centerValue?: string;
};

export default function DonutCard({ title, subtitle, data, className, centerLabel, centerValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="mb-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v: number, n) => [`${Math.round((Number(v) / total) * 100)}%`, n as string]}
              />
            </PieChart>
          </ResponsiveContainer>
          {(centerLabel || centerValue) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerValue && <span className="text-lg font-bold text-foreground tabular-nums">{centerValue}</span>}
              {centerLabel && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</span>}
            </div>
          )}
        </div>
        <ul className="flex-1 min-w-0 space-y-2">
          {data.map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <li key={d.id} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="flex-1 min-w-0 truncate text-foreground font-medium">{d.label}</span>
                <span className="tabular-nums text-muted-foreground w-9 text-right">{pct}%</span>
                {d.amount && <span className="tabular-nums text-foreground font-semibold w-20 text-right">{d.amount}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
