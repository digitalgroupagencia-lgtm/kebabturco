import { cn } from "@/lib/utils";

export type StatusTone = "active" | "standby" | "locked" | "beta" | "warning" | "neutral";

const toneStyles: Record<StatusTone, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  standby: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
  locked: "bg-muted text-muted-foreground border-border",
  beta: "bg-violet-500/12 text-violet-700 dark:text-violet-400 border-violet-500/25",
  warning: "bg-orange-500/12 text-orange-700 dark:text-orange-400 border-orange-500/25",
  neutral: "bg-secondary text-secondary-foreground border-border/60",
};

type Props = {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
};

export default function StatusPill({ label, tone = "neutral", dot, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        toneStyles[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "active" && "bg-emerald-500",
            tone === "standby" && "bg-amber-500",
            tone === "warning" && "bg-orange-500",
            tone === "locked" && "bg-muted-foreground/50",
            tone === "beta" && "bg-violet-500",
            tone === "neutral" && "bg-muted-foreground/50",
          )}
        />
      )}
      {label}
    </span>
  );
}
