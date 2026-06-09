import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** When true, pushes content to the right (e.g. inside a card footer). */
  align?: "start" | "end" | "between";
};

/**
 * Linha padrão de botões de ação:
 * - alinhada à esquerda por defeito (sem w-full)
 * - gap-2, flex-wrap em ecrãs estreitos
 * - botões herdam tamanho h-10 do componente Button
 *
 * Usar SEMPRE este wrapper em vez de aplicar w-full nos botões.
 */
export default function ActionBar({ children, className, align = "start" }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        "[&>button]:w-auto [&>a]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}