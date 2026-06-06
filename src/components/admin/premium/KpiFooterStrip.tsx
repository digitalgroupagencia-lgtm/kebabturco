import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiFooterItem = {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  deltaTone?: "success" | "danger" | "neutral";
  sub?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "purple" | "orange";
};

const TONE: Record<NonNullable<KpiFooterItem["tone"]>, string> = {
  primary: "text-primary bg-primary/10",
  success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  danger: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  info: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
  purple: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
  orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
};

type Props = {
  items: KpiFooterItem[];
  className?: string;
  /** dark contrasting strip — use on light page */
  dark?: boolean;
};

export default function KpiFooterStrip({ items, className, dark }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 grid gap-4",
        dark
          ? "bg-zinc-950 border-zinc-800 text-zinc-100"
          : "bg-card border-border/70",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-3 min-w-0">
          <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center", TONE[i.tone ?? "primary"])}>
            <i.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-[11px] truncate", dark ? "text-zinc-400" : "text-muted-foreground")}>
              {i.label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-base font-bold tabular-nums truncate">{i.value}</p>
              {i.delta && (
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    i.deltaTone === "danger"
                      ? "text-rose-500"
                      : i.deltaTone === "neutral"
                      ? dark ? "text-zinc-400" : "text-muted-foreground"
                      : "text-emerald-500",
                  )}
                >
                  {i.delta}
                </span>
              )}
            </div>
            {i.sub && (
              <p className={cn("text-[10px] truncate", dark ? "text-zinc-500" : "text-muted-foreground")}>{i.sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
