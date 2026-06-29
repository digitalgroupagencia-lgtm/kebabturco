import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaUp?: boolean;
  icon?: LucideIcon;
  className?: string;
  /** KPI derivado / simulado — não usar para decisões comerciais */
  estimated?: boolean;
};

export default function MetricTile({ label, value, sub, delta, deltaUp, icon: Icon, className, estimated }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card px-4 py-3.5 transition-colors hover:border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
            {label}
            {estimated && (
              <span className="ml-1.5 normal-case font-medium text-amber-600 dark:text-amber-400">· est.</span>
            )}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground mt-1 truncate">
            {value}
          </p>
          {(sub || delta) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                    deltaUp === true && "text-emerald-600 dark:text-emerald-400",
                    deltaUp === false && "text-rose-600 dark:text-rose-400",
                    deltaUp === undefined && "text-muted-foreground",
                  )}
                >
                  {deltaUp === true && <TrendingUp className="h-3 w-3" />}
                  {deltaUp === false && <TrendingDown className="h-3 w-3" />}
                  {delta}
                </span>
              )}
              {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
