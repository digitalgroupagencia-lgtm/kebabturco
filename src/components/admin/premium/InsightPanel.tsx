import { cn } from "@/lib/utils";
import type { CentralInsight } from "@/lib/operationalCentralMetrics";

type Props = {
  insights: CentralInsight[];
  title?: string;
  className?: string;
};

export default function InsightPanel({ insights, title = "Insights", className }: Props) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card", className)}>
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/50">
        {insights.map((ins) => (
          <div key={ins.label} className="px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ins.label}
              {ins.estimated && (
                <span className="ml-1.5 normal-case font-medium text-amber-600 dark:text-amber-400">· est.</span>
              )}
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{ins.value}</p>
            {ins.hint && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{ins.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
