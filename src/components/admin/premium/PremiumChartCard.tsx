import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** body padding override */
  bodyClassName?: string;
};

/**
 * Premium chart/section container, title, optional subtitle and action,
 * generous radius and surface.
 */
export default function PremiumChartCard({ title, subtitle, action, children, className, bodyClassName }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn(bodyClassName)}>{children}</div>
    </div>
  );
}
