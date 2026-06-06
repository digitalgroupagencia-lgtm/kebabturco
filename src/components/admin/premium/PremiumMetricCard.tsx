import { LucideIcon, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info" | "danger" | "purple" | "orange" | "neutral";

const TONE_CLASSES: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  info: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/20" },
  danger: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/20" },
  purple: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/20" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border" },
};

type Props = {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** semantic: success = good, danger = bad; default infers from direction */
  deltaTone?: "success" | "danger" | "neutral";
  sub?: string;
  tone?: Tone;
  className?: string;
  estimated?: boolean;
};

export default function PremiumMetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaDirection,
  deltaTone,
  sub,
  tone = "primary",
  className,
  estimated,
}: Props) {
  const c = TONE_CLASSES[tone];
  const resolvedDeltaTone: "success" | "danger" | "neutral" =
    deltaTone ?? (deltaDirection === "up" ? "success" : deltaDirection === "down" ? "danger" : "neutral");
  const DeltaIcon =
    deltaDirection === "up" ? TrendingUp : deltaDirection === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/70 bg-card p-5 transition-all",
        "hover:border-border hover:shadow-[0_4px_18px_-8px_hsl(var(--primary)/0.18)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
            {estimated && (
              <span className="ml-1.5 normal-case font-medium text-amber-600 dark:text-amber-400">· est.</span>
            )}
          </p>
          <p className="mt-2 text-2xl md:text-[28px] font-bold tabular-nums tracking-tight text-foreground leading-none truncate">
            {value}
          </p>
          {(delta || sub) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold",
                    resolvedDeltaTone === "success" && "text-emerald-600 dark:text-emerald-400",
                    resolvedDeltaTone === "danger" && "text-rose-600 dark:text-rose-400",
                    resolvedDeltaTone === "neutral" && "text-muted-foreground",
                  )}
                >
                  <DeltaIcon className="h-3 w-3" />
                  {delta}
                </span>
              )}
              {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
              c.bg,
              c.text,
              c.ring,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
