import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type PremiumMetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color?: "brand" | "green" | "blue" | "orange" | "purple" | "red" | "yellow";
  mode?: "dark" | "light";
};

const colorMap = {
  brand: {
    dark: "bg-[#D62300]/15 text-[#EF4444]",
    light: "bg-[#D62300]/10 text-[#B91C1C]",
  },
  green: {
    dark: "bg-emerald-500/15 text-emerald-400",
    light: "bg-emerald-500/10 text-emerald-600",
  },
  blue: {
    dark: "bg-blue-500/15 text-blue-400",
    light: "bg-blue-500/10 text-blue-600",
  },
  orange: {
    dark: "bg-orange-500/15 text-orange-400",
    light: "bg-orange-500/10 text-orange-600",
  },
  purple: {
    dark: "bg-purple-500/15 text-purple-400",
    light: "bg-purple-500/10 text-purple-600",
  },
  red: {
    dark: "bg-red-500/15 text-red-400",
    light: "bg-red-500/10 text-red-600",
  },
  yellow: {
    dark: "bg-yellow-500/15 text-yellow-400",
    light: "bg-yellow-500/10 text-yellow-600",
  },
};

export function PremiumMetricCard({
  title,
  value,
  subtitle,
  trend,
  trendDirection = "neutral",
  icon: Icon,
  color = "brand",
  mode = "dark",
}: PremiumMetricCardProps) {
  const isDark = mode === "dark";
  const TrendIcon = trendDirection === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        isDark
          ? "border-white/10 bg-[#111111] hover:border-[#D62300]/40"
          : "border-slate-200 bg-white shadow-sm hover:shadow-xl",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              isDark ? "text-zinc-400" : "text-slate-500",
            )}
          >
            {title}
          </p>

          <div
            className={cn(
              "mt-3 text-3xl font-black tabular-nums tracking-tight",
              isDark ? "text-white" : "text-slate-950",
            )}
          >
            {value}
          </div>

          {trend && (
            <div className="mt-3 flex items-center gap-1 text-xs">
              <TrendIcon
                className={cn(
                  "h-3.5 w-3.5",
                  trendDirection === "down" ? "text-red-500" : "text-emerald-500",
                )}
              />
              <span
                className={cn(
                  "font-semibold",
                  trendDirection === "down" ? "text-red-500" : "text-emerald-500",
                )}
              >
                {trend}
              </span>
              {subtitle && (
                <span className={isDark ? "text-zinc-500" : "text-slate-500"}>
                  {subtitle}
                </span>
              )}
            </div>
          )}

          {!trend && subtitle && (
            <p className={cn("mt-2 text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            colorMap[color][mode],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}
