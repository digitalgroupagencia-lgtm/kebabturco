import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  title: string;
  detail?: string;
  time: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "muted";
};

type Props = {
  items: ActivityItem[];
  title?: string;
  className?: string;
  emptyMessage?: string;
};

const toneIcon: Record<NonNullable<ActivityItem["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  muted: "bg-muted text-muted-foreground",
};

export default function ActivityFeed({ items, title = "Actividade recente", className, emptyMessage }: Props) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card", className)}>
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/50 max-h-[320px] overflow-y-auto">
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage ?? "Sem actividade recente"}
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                toneIcon[item.tone ?? "default"],
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
              {item.detail && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 tabular-nums">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
