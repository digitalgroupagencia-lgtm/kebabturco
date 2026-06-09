import { ReactNode } from "react";

export interface PremiumTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  /** Marca explicitamente a coluna como numérica/estado — força alinhamento à direita e tabular-nums. */
  numeric?: boolean;
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
          {columns.map((c) => {
            const align = c.numeric ? "right" : (c.align ?? "left");
            return (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-${align}`}
              >
                {c.header}
              </th>
            );
          })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : i}
              className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              {columns.map((c) => {
                const align = c.numeric ? "right" : (c.align ?? "left");
                return (
                  <td
                    key={c.key}
                    className={`px-4 py-2.5 text-${align} text-foreground tabular-nums [&_.badge]:scale-100`}
                  >
                    {c.render(row, i)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
