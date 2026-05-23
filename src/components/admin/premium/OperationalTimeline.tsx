import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/operationalCentralMetrics";

type Props = {
  events: TimelineEvent[];
  title?: string;
  className?: string;
};

const toneBorder: Record<NonNullable<TimelineEvent["tone"]>, string> = {
  default: "border-l-primary",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  muted: "border-l-muted-foreground/40",
};

export default function OperationalTimeline({ events, title = "Linha temporal", className }: Props) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card", className)}>
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-0">
        {events.map((ev, i) => (
          <div
            key={ev.id}
            className={cn(
              "relative pl-4 pb-4 border-l-2 ml-1",
              toneBorder[ev.tone ?? "default"],
              i === events.length - 1 && "pb-0",
            )}
          >
            <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-background border-2 border-primary/60" />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">{ev.title}</p>
                {ev.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>
                )}
                {ev.impact && (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {ev.impact}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{ev.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
