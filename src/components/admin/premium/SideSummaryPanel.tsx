import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Item = { label: string; value: ReactNode; tone?: "default" | "danger" | "success" };
type Section = { title: string; items: Item[] };

type Props = {
  sections: Section[];
  footer?: ReactNode;
  className?: string;
};

export default function SideSummaryPanel({ sections, footer, className }: Props) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-5 space-y-5 self-start sticky top-20",
        className,
      )}
    >
      {sections.map((s, i) => (
        <div key={i}>
          <h4 className="text-sm font-bold text-foreground mb-3">{s.title}</h4>
          <ul className="space-y-2">
            {s.items.map((it, j) => (
              <li key={j} className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground truncate">{it.label}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums shrink-0",
                    it.tone === "danger" && "text-rose-500",
                    it.tone === "success" && "text-emerald-500",
                    !it.tone || it.tone === "default" ? "text-foreground" : "",
                  )}
                >
                  {it.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {footer && <div className="pt-3 border-t border-border/60">{footer}</div>}
    </aside>
  );
}
