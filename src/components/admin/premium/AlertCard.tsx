import { AlertCircle, AlertTriangle, CheckCircle2, Info, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AlertSeverity = "critical" | "warning" | "info" | "resolved";

export type AlertItem = {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
};

const SEV: Record<AlertSeverity, { icon: LucideIcon; bg: string; text: string; badge: string; badgeLabel: string }> = {
  critical: { icon: AlertCircle, bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", badgeLabel: "Crítico" },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", badgeLabel: "Médio" },
  info: { icon: Info, bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", badgeLabel: "Baixo" },
  resolved: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", badgeLabel: "Resolvido" },
};

type Props = {
  title: string;
  subtitle?: string;
  items: AlertItem[];
  action?: React.ReactNode;
  className?: string;
  emptyLabel?: string;
};

export default function AlertCard({ title, subtitle, items, action, className, emptyLabel = "Sem alertas no momento" }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5 h-full flex flex-col", className)}>
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
        <ul className="space-y-2">
          {items.map((item) => {
            const sev = SEV[item.severity];
            const Icon = item.icon ?? sev.icon;
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", sev.bg, sev.text)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug break-words flex-1 min-w-0">{item.title}</p>
                    <span className={cn("shrink-0 h-5 inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 rounded-md border tabular-nums", sev.badge)}>
                      {sev.badgeLabel}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-snug break-words">{item.description}</p>
                  )}
                  {item.actionLabel && item.onAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs font-semibold text-primary hover:text-primary"
                      onClick={item.onAction}
                    >
                      {item.actionLabel}
                    </Button>
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
