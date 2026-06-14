import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
};

const COLS: Record<NonNullable<Props["cols"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

/** Grid com cartões da mesma altura (padrão visual admin). */
export default function EqualCardGrid({ children, className, cols = 3 }: Props) {
  return (
    <div className={cn("grid auto-rows-fr gap-3", COLS[cols], className)}>
      {children}
    </div>
  );
}
