import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PerformanceRow = {
  id: string;
  label: string;
  name: string;
  value: string;
  icon: LucideIcon;
  tone?: "success" | "warning" | "info" | "purple" | "primary";
};

const TONE: Record<NonNullable<PerformanceRow["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

type Props = {
  title: string;
  subtitle?: string;
  rows: PerformanceRow[];
  action?: React.ReactNode;
  className?: string;
};

export default function PerformanceCard({ title, subtitle, rows, action, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center", TONE[r.tone ?? "primary"])}>
              <r.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{r.label}</p>
              <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
            </div>
            <p className="text-sm font-bold tabular-nums text-foreground shrink-0">{r.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
