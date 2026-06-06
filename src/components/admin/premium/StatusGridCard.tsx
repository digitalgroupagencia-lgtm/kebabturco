import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusItem = {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral" | "purple";
};

const TONE: Record<StatusItem["tone"], { bg: string; text: string }> = {
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  danger: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  info: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
  purple: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
};

type Props = {
  title: string;
  subtitle?: string;
  items: StatusItem[];
  className?: string;
  columns?: 2 | 3;
};

export default function StatusGridCard({ title, subtitle, items, className, columns = 2 }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className={cn("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {items.map((i) => {
          const t = TONE[i.tone];
          return (
            <div key={i.id} className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.bg, t.text)}>
                <i.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{i.label}</p>
                <p className="text-base font-bold text-foreground tabular-nums leading-none mt-0.5">{i.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
