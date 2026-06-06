import { ReactNode } from "react";
import { PremiumCard } from "./PremiumCard";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type PremiumTableProps<T> = {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  empty?: ReactNode;
  mode?: "dark" | "light";
};

export function PremiumTable<T>({
  title,
  subtitle,
  rows,
  columns,
  empty,
  mode = "dark",
}: PremiumTableProps<T>) {
  const isDark = mode === "dark";

  return (
    <PremiumCard title={title} subtitle={subtitle} mode={mode}>
      {rows.length === 0 && empty ? (
        empty
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead className={isDark ? "bg-white/[0.03]" : "bg-slate-50"}>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em]",
                      isDark ? "text-zinc-500" : "text-slate-500",
                      col.className,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-t transition",
                    isDark
                      ? "border-white/10 hover:bg-white/[0.03]"
                      : "border-slate-100 hover:bg-slate-50",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4 text-sm">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PremiumCard>
  );
}
