import { cn } from "@/lib/utils";

export type FunnelStep = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  subtitle?: string;
  steps: FunnelStep[];
  className?: string;
};

export default function FunnelCard({ title, subtitle, steps, className }: Props) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {steps.map((s) => {
            const w = 30 + Math.round((s.value / max) * 70);
            return (
              <div
                key={s.id}
                className="h-7 rounded-md transition-all"
                style={{ width: `${w}%`, background: s.color }}
              />
            );
          })}
        </div>
        <ul className="space-y-2 shrink-0">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs h-7">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-foreground font-medium w-24 truncate">{s.label}</span>
              <span className="tabular-nums font-bold text-foreground w-12 text-right">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
