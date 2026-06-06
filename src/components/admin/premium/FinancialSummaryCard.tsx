import { cn } from "@/lib/utils";

export type FinancialColumn = {
  id: string;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "success" | "danger" | "neutral";
};

type Props = {
  title: string;
  columns: FinancialColumn[];
  className?: string;
};

export default function FinancialSummaryCard({ title, columns, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <h3 className="text-base font-bold text-foreground mb-4">{title}</h3>
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((c) => (
          <div key={c.id} className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{c.label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground truncate">{c.value}</p>
            {c.delta && (
              <p
                className={cn(
                  "mt-1 text-[11px] font-semibold tabular-nums",
                  c.deltaTone === "danger"
                    ? "text-rose-500"
                    : c.deltaTone === "neutral"
                    ? "text-muted-foreground"
                    : "text-emerald-500",
                )}
              >
                {c.delta}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
