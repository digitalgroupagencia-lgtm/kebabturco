import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Quantas colunas em ecrãs largos. */
  cols?: 1 | 2 | 3 | 4;
  /** Espaçamento entre cards (Tailwind gap-N). */
  gap?: 3 | 4 | 5 | 6;
};

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const GAP: Record<number, string> = {
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
};

/**
 * Grelha de cards do mesmo grupo com altura igual.
 * Usa `auto-rows-fr` e força `h-full` nos filhos directos para que
 * todos os cards na mesma linha tenham a mesma altura — sem alterar
 * cada Card individual.
 */
export default function EqualCardGrid({ children, className, cols = 3, gap = 4 }: Props) {
  return (
    <div
      className={cn(
        "grid auto-rows-fr",
        COLS[cols],
        GAP[gap],
        "[&>*]:h-full [&>*]:flex [&>*]:flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}