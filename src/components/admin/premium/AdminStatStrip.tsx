import { cn } from "@/lib/utils";

type Stat = { label: string; value: string; tone?: "default" | "success" | "muted" | "warning" };

type Props = {
  stats: Stat[];
  className?: string;
};

const toneCls: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  muted: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400",
};

export default function AdminStatStrip({ stats, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border bg-card/80 backdrop-blur-sm p-3 shadow-sm",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 px-1">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground truncate">
            {s.label}
          </p>
          <p className={cn("text-sm font-black tabular-nums truncate mt-0.5", toneCls[s.tone ?? "default"])}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
