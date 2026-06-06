import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type RankingItem = {
  id: string;
  name: string;
  primary: string;
  secondary?: string;
  value: number;
  max?: number;
  icon?: LucideIcon;
  imageUrl?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  items: RankingItem[];
  action?: React.ReactNode;
  className?: string;
  emptyLabel?: string;
};

export default function RankingCard({ title, subtitle, items, action, className, emptyLabel = "Sem dados ainda" }: Props) {
  const max = Math.max(1, ...items.map((i) => i.max ?? i.value));
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, idx) => {
            const pct = Math.min(100, Math.round((item.value / max) * 100));
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground tabular-nums text-center">
                  {idx + 1}
                </span>
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : Icon ? (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{item.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground shrink-0 tabular-nums">{item.primary}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {item.secondary && (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{item.secondary}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
