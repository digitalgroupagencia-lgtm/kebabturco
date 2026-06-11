import { ReactNode } from "react";

export interface PremiumTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T, index: number) => ReactNode;
}

interface PremiumTableProps<T> {
  columns: PremiumTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  rowKey?: (row: T, i: number) => string;
}

export default function PremiumTable<T>({
  columns,
  rows,
  emptyMessage = "Sem registos",
  rowKey,
}: PremiumTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-${c.align ?? "left"}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : i}
              className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 text-${c.align ?? "left"} text-foreground tabular-nums`}
                >
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
